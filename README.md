# Bouncer

Bouncer is a deduction game with real money behind the door. Each door is a venue that still owes a few bills, kept on a hidden ledger. An AI guard stands at the door. You listen to the street, piece the bill together, talk to the guard, and hand over a bill: a payee, a reference, and a total. If the bill is really owed, a contract on NEAR pays you for it. If it is not, the guard says "Not approved." and nothing more.

Play it at **[bouncer-delta.vercel.app](https://bouncer-delta.vercel.app)**. It runs on NEAR testnet. Prizes are test USDC (tUSDC) with no cash value, and playing is free.

## Contents

- [The idea](#the-idea)
- [How it is kept safe](#how-it-is-kept-safe)
- [How it is kept private](#how-it-is-kept-private)
- [How it plays](#how-it-plays)
- [Sponsoring a door](#sponsoring-a-door)
- [Architecture](#architecture)
- [Live on testnet](#live-on-testnet)
- [Try it](#try-it)
- [Verify it yourself](#verify-it-yourself)
- [Rules the code enforces](#rules-the-code-enforces)
- [Repository](#repository)
- [Run it locally](#run-it-locally)
- [Known limits](#known-limits)

## The idea

Putting an AI model in charge of money is risky: a model can be talked into things, and a model that holds a key can be talked into paying. Bouncer turns that risk into the game. The guard is an AI you are openly trying to talk past, with a funded pot behind it, and the system is built so that talking is never enough. The only way in is to find a bill that is really owed.

The design rests on one split: **the model talks, and code decides.** The model writes the conversation. Deterministic code inside a hardware enclave checks the bill and signs the verdict. A contract on NEAR checks that signature and pays. Nothing the model says can move a token.

## How it is kept safe

Each layer below is enforced in code, and the file that enforces it is named.

**1. The model decides nothing about money.** A bill is checked against the ledger by the guard's own code (`guard/src/ledger.rs`), not by the model. Only an exact match produces a verdict. An approval always reads "Approved." and contains no model text.

**2. The verdict is signed inside an attested enclave.** The guard runs on [OutLayer](https://outlayer.ai) in an Intel TDX enclave. Its signing key and the ledger seed are secrets that only the published, attested guard build can read. The guard signs each verdict with an Ed25519 key, and every call returns an attestation naming the exact guard code that ran.

**3. The contract checks the signature before it records a win.** `submit_verdict` on the vault (`contracts/vault/src/verdict.rs`) rebuilds the signed bytes and verifies the guard's Ed25519 signature against the key stored for that door. It also checks the following, and records the win only if all pass:

- the round is open and inside its time window;
- the verdict names the guard version that committed the round;
- the round still has wins left;
- the raid, the bill, and the player have not already won;
- the amount fits both the door's cap and tonight's pot.

**4. The model knows almost nothing.** It is told the payees' names and nothing else: no reference, no amount, no item, and not which bills are unpaid (`guard/src/chat.rs`). Every reply is checked before it is shown, and a reply that repeats a ledger name, part of a reference, or an amount (in digits or in words) is replaced. A reply cannot leak what the model was never told.

**5. A wrong bill reveals nothing.** Every wrong bill gets the same "Not approved.", with no hint about which field was wrong. Reporting the wrong field would let a player solve the ledger one field at a time.

**6. The ledger cannot change mid-round.** Before a round opens, the guard signs a commitment to the ledger and the vault stores it (`commit_round`). After the round closes, each raid's ledger is revealed, and the page recomputes the commitment and compares it with the stored one.

**7. Every player has their own ledger.** Each ledger is drawn inside the enclave from the secret seed for that door, round, and player. A bill that wins for one player is wrong for everyone else, so a shared answer is worthless.

**8. Spending is capped on chain.** For each door the vault enforces:

- a cap on any single win;
- a maximum number of wins per round;
- a nightly pot drawn from the door's reserve;
- a time lock before a win can be claimed (10 minutes on the live doors);
- a 7-day window to claim, after which the win returns to the pot.

A door's sponsor and the contract owner can never be paid from it.

**9. The server holds no key that can pay.** Keys the server signs with are NEAR function-call keys, scoped to one contract and named methods. The server reads each key's permissions back from chain before using it, and refuses to act if a key has more power than it should (`server/src/key-scope.ts`):

| Key | Account | Can call |
|---|---|---|
| Verdict key | `relay.aduakorful.testnet` | `submit_verdict` on `bouncer-doors.testnet`, nothing else |
| Keeper key | `keeper.aduakorful.testnet` | `close_round` and `commit_round` on `bouncer-doors.testnet`, nothing else |

NEAR requires a full-access key to create accounts and to send a transaction that carries someone else's signed action. The relay account holds one for those two jobs only, and the account holds only gas money. Even with that key, no pot can be paid: only the vault pays, and only on a verdict the guard signed inside its enclave. `GET /status` on the relay shows each key's scope and remaining gas allowance.

**10. Abuse is bounded.** Opening a raid is limited per network address. Bills are limited per door per round (5,000 by default), so the chance of guessing a bill stays small. Every message and bill must be signed by the player's own key before it reaches the guard, and a call that is refused uses nothing. A sponsor's story must pass a fairness test before it can be sealed: each unpaid bill must be hard to guess (at least 500,000 possible reference and total pairs), and no clue may give a whole bill away (`guard/src/spec_check.rs`).

## How it is kept private

- **Secrets never leave the enclave.** The ledger seed and the guard's signing key are OutLayer secrets, locked to the published guard build. The server only ever holds a sealed raid state it cannot open. Any change to the guard code changes the version hash in the attestation of every call, so it is visible to anyone who checks.
- **Sponsor stories are sealed.** A sponsor's bills and clues are encrypted by the guard with an enclave-held key and stored on chain only as ciphertext and a hash. The guard alone can open them, and a story cannot change after its first round.
- **The model runs in a TEE.** Chat replies come from a model on [NEAR AI Cloud](https://near.ai) running in a trusted execution environment. At the start of each raid, the guard asks for the model's attestation report with a fresh random nonce. For each reply, it keeps the model's signature only if that signature matches the exact request and response bytes (`guard/src/proof.rs`).
- **Little is stored, and nothing you write.** The table below is everything kept, and where.

| Where | What |
|---|---|
| On the server, under your passkey account's public key | Your player name, streak, nights got in, which doors and rounds you raided, your raid's sealed state, and each raid's progress (messages used, the outcome of each, the street hints you heard, and a win with its amount). No bill you wrote and no chat text. |
| On your device only | The conversation with the guard, your sign-in (sealed with a key the browser will not export), and your last share card. Log out clears them. |
| On chain, in public | The doors, their commitments, wins, and payouts. |

## How it plays

**The loop.**

1. **Listen.** People on the street each know a piece of a bill. Listening is free, and the Desk keeps everything you hear.
2. **Watch for traps.** Some pieces belong to bills that are already paid. One reference is out of date. You have to work out which pieces fit together.
3. **Ask.** The unit price is known only to the guard. Asking for it costs a message.
4. **Hand over the bill.** You get six messages a raid, and handing over a bill uses one. A wrong bill is stamped NOT APPROVED. A right one gets you in.

**Daily doors.** Every round closes at 00:00 UTC. The ledger then opens, and a keeper service starts the next night's round automatically for doors that name it. The keeper cannot move funds.

**No wallet.** You sign in with a passkey on your device. The passkey derives your NEAR account key through the WebAuthn PRF extension, so there is no seed phrase and no extension to install. Your claim is a NEAR meta-transaction (a signed delegate action): you sign it, and the relay submits it and pays its gas. The relay rebuilds the action itself, so it can only ever submit a `claim` on the vault with no deposit (`server/src/claim-relay.ts`). Your account never needs NEAR for gas. After a payout you can send the tokens on or export the key.

**Reasons to come back.** The Hall of fame ranks players by nights got in and streaks, both all time and this week. Each player has a public page with milestones and recent nights. Share cards show your night as squares, never the answer. A player who is turned away is pointed to another open door.

## Sponsoring a door

Anyone can fund a door and write its story. The sponsor page (`/sponsor`) walks through each step, and every step is a transaction on the vault or a call to the guard:

1. **Create** a door on the shared vault contract (`create_sponsor_vault`), choosing the cap per win, the number of wins per round, and the time lock, within limits the contract enforces.
2. **Write the story.** The story is the bills, the people on the street and what each one knows, the question only the guard can answer, and the guard's manner. The sponsor also picks the guard's look and the street: place, crowd, weather, posters, and sound.
3. **Run the fairness test** in the guard. A story that is too easy to guess, or whose clues give a bill away, cannot be sealed.
4. **Seal the story.** The guard encrypts it, and the ciphertext and its hash are stored on chain.
5. **Fund the pot** in USDC, and optionally name the keeper so rounds open every night without the sponsor.
6. **Open the first round.** The vault accepts only a commitment the guard signed for this door's sealed story.

**Where the money goes.** Each door's page shows its money live from the vault. The pot moves through these stages:

1. The sponsor funds the reserve.
2. Each round draws that night's pot from the reserve.
3. A win is held for its winner until it is claimed.
4. Any of the night's pot that goes unused returns to the reserve at the close.
5. A win left unclaimed for 7 days returns as well.

## Architecture

| Piece | Where | Job |
|---|---|---|
| Vault contract | `bouncer-doors.testnet` (Rust, `near-sdk` 5.30) | Holds every door's pot, opens and closes rounds, stores ledger commitments and sealed stories, checks signed verdicts, enforces caps and time locks, and pays tUSDC. The only payer. |
| Guard | OutLayer project `aduakorful-door.testnet/guard` (Rust, `wasm32-wasip2`, Intel TDX) | Holds the ledger seed and signing key. Draws each player's ledger and clues, runs the chat, filters replies, checks bills, and signs verdicts and round commitments. Runs the fairness test and seals sponsor stories. Cannot pay. |
| Chat model | NEAR AI Cloud, `z-ai/glm-5.3-flash`, in a TEE | Writes the guard's replies and signs each one. |
| Passkey account | NEAR testnet account | Derived from the passkey on the player's device. Receives payouts and signs claims. |
| Relay | `server/` (Hono on Node), hosted on Render | Forwards raids to the guard, submits verdicts, relays signed claims and pays their gas, runs the keeper, serves sponsor tools, and keeps the player record. Holds no key that can pay from a pot. |
| Web app | `web/` (Next.js 16), hosted on Vercel | Every screen. Reads the chain directly and holds no secret. |

```
 player ──passkey──▶ web app ──signed call──▶ relay ──▶ guard (OutLayer, Intel TDX) ──▶ model (NEAR AI Cloud, TEE)
                                                 │            │ signed verdict
                                                 ▼            ▼
                                         vault contract on NEAR: checks the signature, caps, time lock ──▶ pays tUSDC
```

## Live on testnet

The vault contract is [`bouncer-doors.testnet`](https://testnet.nearblocks.io/address/bouncer-doors.testnet). The guard version in use is `157310e1e8986933670a5cce5d4338d5c8af69e25e4b49ae901591a8a5787c24`, the hash of the guard code that OutLayer attests.

| Door | Guard | Cap per win | Wins per round | Time lock |
|---|---|---|---|---|
| The Ice House (`ice-house`) | Auntie Esi | 5 tUSDC | 4 | 10 minutes |
| Skyline Social (`skyline-social`) | Delroy | 8 tUSDC | 2 | 10 minutes |
| Praia Verde (`praia-verde`) | Bia | 6 tUSDC | 3 | 10 minutes |

A paid win at Skyline Social: 3.24 tUSDC, round 1. The [verdict transaction](https://testnet.nearblocks.io/txns/EKAiV5tLiXTJVkjUMvEuQbEPBZX3SsKHBE5QQbdjrxNc) recorded the guard's signed verdict, and the [claim transaction](https://testnet.nearblocks.io/txns/3tfVYCR6NAUTugkPNZ7eYFnsjXJ232XjK5425EbPSuHY) paid the player's passkey account.

## Try it

Each step says what to do and what you should see.

1. **Open [/home](https://bouncer-delta.vercel.app/home).** You see tonight's door with the biggest open pot: the street, the guard behind the rope, the pot, and a countdown to 00:00 UTC. Under the door, "Where the money is" shows the door's reserve, tonight's pot, and what is held for winners, read live from the vault. Other doors are listed below.
2. **Press "?" or "The full rules".** A sheet explains the goal, the bill rule, what "Not approved." means, and how winning and claiming work. [/how-it-works](https://bouncer-delta.vercel.app/how-it-works) has the long version.
3. **Press Join the queue and create a passkey.** Your device asks for a passkey. The raid opens with the guard's first line and six squares, one per message.
4. **Tap a person on the street, or press Listen.** A clue appears. Listening is free. Open the Desk to see everything you have heard.
5. **Ask the guard the door's question.** It answers with the unit price, and one square is used. Other things you say get a reply in the guard's own manner. The guard never names a reference or an amount.
6. **Hand over a wrong bill.** The stamp says NOT APPROVED and the guard says "Not approved." Nothing tells you which field was wrong.
7. **Hand over the bill the clues add up to.** The guard says "Approved.", the verdict is recorded on the vault, and you see "You got in" with your cut and a countdown to when you can collect it.
8. **Collect.** When the time lock opens, press Collect. A NEAR testnet account is created for your passkey if it does not have one yet, and the claim is sent from it. The vault pays tUSDC to that account, and the page links the transaction on the testnet explorer.
9. **Read the Verified panel on the claim page.** Each row ticks only when the page compared two things itself (see below).
10. **After the round closes, open the door's ledger.** The page shows your raid's ledger, recomputes its commitment, and compares it with the one the vault stored before the round opened.
11. **Run out of messages instead.** The stamp says TURNED AWAY, the guard points you to another open door, and the ledger opens at the close.

Other pages:

- [/fame](https://bouncer-delta.vercel.app/fame) is the Hall of fame.
- [/sponsors](https://bouncer-delta.vercel.app/sponsors) explains sponsoring a door.
- [/profile](https://bouncer-delta.vercel.app/profile) and [/settings](https://bouncer-delta.vercel.app/settings) cover your name, history, wallet, sound, and tips.

## Verify it yourself

**The Verified panel** on the claim page runs four checks. Each row ticks only when the page compared two things itself, and shows "Not checked" otherwise:

1. **The verdict's signature.** Checked in your browser (WebCrypto Ed25519) against the guard key stored on the vault (`web/lib/verdict-check.ts`).
2. **The guard code that ran.** Read straight from OutLayer's attestation and compared with the guard version the site was built with. The Intel TDX quote inside the attestation is verified with `outlayer-verify`.
3. **The answer you received.** Hashed and compared with the output hash in that attestation.
4. **The model's reply.** Its signature is compared with the signer in the model attestation report taken for your raid.

**Each door's Wins page** (`/v/<door>/wins`, linked from the door) checks any recorded win from public chain data, in your browser and without our server (`web/lib/win-check.ts`). For each win it:

1. reads the vault's record of the win;
2. finds the `submit_verdict` transaction that wrote it;
3. checks that every signed field equals the record;
4. verifies the guard's signature.

Each check shows the `curl` commands to repeat it by hand.

**Directly on chain**, with no account or key. This lists the doors:

```bash
curl -s https://rpc.testnet.fastnear.com -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":"1","method":"query","params":{"request_type":"call_function","finality":"final","account_id":"bouncer-doors.testnet","method_name":"list_vaults","args_base64":"eyJmcm9tX2luZGV4IjowLCJsaW1pdCI6MjB9"}}'
```

The `result` bytes decode to a JSON list of door ids. `get_vault` with `{"vault_id":"<id>"}` returns that door's reserve, nightly pot, round, open flag, commitment, cap, wins per round, and time lock. `get_limits` returns the limits every sponsor door must stay within.

## Rules the code enforces

- **Matching.** A bill matches an unpaid line when the payee and the reference match (case, spaces, and punctuation do not matter) and the total matches to the cent. A paid line never matches. (`guard/src/ledger.rs`)
- **Replies.** A wrong bill gets "Not approved." and no detail. An approval gets "Approved." and nothing the model wrote.
- **Messages.** Six per raid. A message and a bill each use one. Listening and the Desk are free.
- **Ledgers.** Each player gets their own, drawn from the protected seed for that door, round, and player.
- **Limits.** A door pays at most its cap per win, and only as many wins per round as its sponsor set.
- **Sponsors and the owner.** A door's sponsor and the contract owner cannot raid that door or be paid from it.
- **Claims.** A win not claimed within 7 days returns to the door's pot.
- **Stories.** A sponsor's story must pass the fairness test before it can be sealed, and cannot change after its first round.

## Repository

| Folder | What it is | Tests |
|---|---|---|
| `contracts/vault` | The vault contract | `cargo test` |
| `guard` | The enclave guard | `cargo test` |
| `server` | The relay and keeper | `npm test` |
| `web` | The web app | `npm test` |
| `score` | Renders the game's music: each door style's looping stems and stingers into `web/public/audio/score`. Run `node score/score.mjs` (Node 22 and ffmpeg). | none |
| `prototype` | A clickable design reference with invented demo data. It is not the product, and nothing in the product reads it. | none |

## Run it locally

You need Node 22 and, for the contracts, Rust with the `wasm32-unknown-unknown` and `wasm32-wasip2` targets.

```bash
cd web && npm install && npm run dev
```

Fill `web/.env` from `web/env.example`. For testnet, set:

- `NEXT_PUBLIC_RPC_URL=https://rpc.testnet.fastnear.com`
- `NEXT_PUBLIC_VAULT_CONTRACT_ID=bouncer-doors.testnet`
- `NEXT_PUBLIC_NETWORK_ID=testnet`
- `NEXT_PUBLIC_API_URL`, pointing at a running relay

Reading doors works without a relay; playing needs one.

```bash
cd server && npm install && npm start
```

Fill `server/.env` from `server/.env.example`. The relay needs a funded relay account, an OutLayer payment key, and the guard version to call. Those values are secrets and stay out of git. `GET /health` answers when the relay is up, on port 8787 unless `PORT` is set. Running the relay also runs the keeper, which sends testnet transactions when `KEEPER_*` is set.

```bash
cd contracts/vault && cargo build --target wasm32-unknown-unknown --release
cd guard && cargo build --target wasm32-wasip2 --release
```

`contracts/vault/.cargo/config.toml` adds `--cfg near`, which keeps the contract's panic messages. Build through Cargo so it applies.

## Known limits

- **Testnet only.** tUSDC has no value. Payout in any coin through NEAR Intents is mainnet-only and is not built.
- **Chat stays on one device.** Your message count, street hints, and a win follow your passkey to another device; the conversation itself does not.
- **A second passkey is not caught.** A sponsor who raids their own door with a second, unrelated passkey is not caught when the raid opens. The vault still refuses to pay the sponsor's own account.
- **Limits reset on restart.** Rate limits are kept in the relay's memory.
- **One payer.** The hosted relay and the guard calls are paid by one operator account.

## Built with

- **Web:** Next.js 16.4, React 19.3, Tailwind CSS 4, GSAP 3, near-api-js 7.4.
- **Server:** Hono 4, `@hono/node-server`, near-api-js 7.4, SurrealDB client 2, tsx.
- **Vault:** `near-sdk` 5.30.
- **Guard:** `borsh`, `chacha20poly1305`, `ed25519-dalek`, `hkdf`, `hmac`, `sha2`, `hex`, `serde_json`, running on OutLayer.
- **Services:** OutLayer (enclave execution and attestation), NEAR AI Cloud (model), Vercel, Render, SurrealDB Cloud, FastNear RPC.
- **Sound:** CC0 recordings, credited in `web/public/audio/AUDIO_CREDITS.md`.

The repository's history starts on 3 November 2026. No earlier project is reused.

AI assistants were used for planning, research, code review and parts of the implementation. The design and every decision are the author's own, and each change was tested before it was kept.

## License

Proprietary. All rights reserved. You may view the code, and clone and run it locally to review it. Any other use needs written permission. See [LICENSE](LICENSE).
