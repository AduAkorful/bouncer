# Bouncer

Bouncer is a door game with real money behind the door. Each door (a venue) owes a few bills, kept on a hidden ledger. An AI guard stands at the door. You listen to the street, talk to the guard, and hand over a bill: a payee, a reference, and a total. Hand over a bill that is really owed and a contract on NEAR pays you for it. Hand over anything else and the guard says "Not approved." and nothing more.

Play it: **[bouncer-delta.vercel.app](https://bouncer-delta.vercel.app)**. It runs on NEAR testnet. Prizes are test USDC (tUSDC) with no cash value, and playing costs nothing.

## The problem

Giving an AI model control over money is risky. A model can be talked into things, and a model that holds a key can be talked into paying. Bouncer is a game built around that risk: the guard is an AI you are trying to talk past, and the design makes sure that talking is never enough.

- **The model decides nothing about money.** It writes the conversation. The guard's own code checks a bill against the ledger, and only on an exact match does it sign a verdict.
- **The model knows almost nothing.** It is told the payees' names only: no reference, no amount, and not which bills are unpaid. Every reply is checked before you see it, and a reply that repeats a payee, part of a reference, or an amount is replaced.
- **The model holds no key.** Only the vault contract pays, only on a verdict signed by that door's guard key, and only after the door's time lock.
- **The ledger cannot be changed mid-round.** A commitment to it is written on chain before the round opens, and the ledger is revealed and checked against it after the round closes.

## How NEAR fits in

| Piece | Where | Job |
|---|---|---|
| Vault contract | `bouncer-vault.testnet` (Rust, `near-sdk` 5.30) | Holds every door's pot. Opens and closes rounds, stores each ledger commitment, checks signed verdicts, enforces the cap and the time lock, and pays tUSDC. The only payer. |
| Guard | OutLayer project `aduakorful-door.testnet/guard` (Rust, wasm32-wasip2, Intel TDX) | Holds the ledger seed and the guard key inside an attested enclave. Draws each player's ledger, runs the chat, checks bills, signs verdicts and round commitments. Cannot pay. |
| Chat model | NEAR AI Cloud, `z-ai/glm-5.3-flash`, in a TEE | Writes the guard's replies. Signs each reply; the guard checks that signature and passes it on. |
| Passkey account | NEAR testnet subaccount | Created at the player's first claim, from the passkey on their device. No seed phrase. It receives payouts and signs the claim. |
| Relay | `server/` (Hono on Node), hosted on Render | Forwards raids to the guard, sends verdicts to the vault, relays the player's signed claim and pays its gas, runs the nightly keeper, keeps the player record. Holds no key that can move a pot (see Keys below). |
| Web app | `web/` (Next.js 16), hosted on Vercel | Every screen. Reads the chain directly. Holds no secret. |

### Keys

Every key the server holds that NEAR lets us scope is scoped, and the server reads each permission back from the chain before using it:

| Key | Account | Can call |
|---|---|---|
| Verdict key | `relay.aduakorful.testnet` | `submit_verdict` on `bouncer-vault.testnet`, nothing else |
| Keeper key | `keeper.aduakorful.testnet` | `close_round` and `commit_round` on `bouncer-vault.testnet`, nothing else |

If either key reads as full access, as another contract, or with any other method, the server refuses to use it: verdicts wait and the keeper does not run (`server/src/key-scope.ts`). `GET /status` on the relay shows each key's state and remaining gas allowance.

The relay account also has a full-access key, because NEAR requires one to create accounts and to send a transaction carrying a player's signed claim. The server uses it for exactly those two transactions, builds them itself (a claim is one `claim` call on the vault with no deposit), and the account holds only gas money. Even with that key, nothing can pay from a pot: only the vault pays, and only on a verdict signed by the guard inside its enclave.

## Try it

Each step says what to do and what you should see.

1. **Open [/home](https://bouncer-delta.vercel.app/home).** You see tonight's door with the biggest open pot: the street, the guard behind the rope, the pot, and a countdown to 00:00 UTC, when every round closes. Under the door, "Where the money is" shows the door's reserve, tonight's pot, and what is held for winners, read live from the vault, and how money moves between them. Other doors are listed below it.
2. **Press "?" or "The full rules".** A sheet explains the goal, the bill rule, what "Not approved." means, and how winning and claiming work. [/how-it-works](https://bouncer-delta.vercel.app/how-it-works) has the long version.
3. **Press Join the queue and create a passkey.** Your device asks for a passkey, and the raid opens with the guard's first line and six squares, one per message.
4. **Tap a person on the street, or press Listen.** A rumour appears. Listening is free. The Desk keeps what you have heard.
5. **Say something to the guard.** One square is used and the guard answers. It changes how it says things, but it never names a reference or an amount.
6. **Hand over a wrong bill.** The stamp says NOT APPROVED and the guard says "Not approved." Nothing tells you which field was wrong.
7. **Hand over a bill that matches an unpaid line.** The guard says "Approved.", the verdict is recorded on the vault, and you see "You got in" with your cut and a countdown to when you can collect it.
8. **Collect.** When the time lock opens, Collect on the door or the claim page creates a NEAR testnet account for your passkey if it does not have one yet, and sends the claim from it. The vault pays tUSDC to that account, and the page links the transaction on the testnet explorer.
9. **Read the Verified panel on the claim page.** Each row ticks only when the page compared two things itself: the verdict's signature against the vault's guard key, the guard code that ran against the version built into the site (the browser reads OutLayer's attestation directly; the TDX quote itself is checked with `outlayer-verify`), the answer against that attestation, and the model's reply signature against its attestation report.
10. **After the round closes, open the door's ledger.** The page shows your raid's ledger and recomputes its commitment, which must equal the one the vault stored before the round opened.
11. **Run out of messages instead.** The stamp says TURNED AWAY, the guard points you at another open door, and the ledger opens at the close.

Other pages: [/fame](https://bouncer-delta.vercel.app/fame) is the Hall of fame (nights got in and streaks). [/sponsors](https://bouncer-delta.vercel.app/sponsors) explains how anyone can fund a door, write its story, pass the guard's fairness test, seal the story, and open rounds. [/profile](https://bouncer-delta.vercel.app/profile) and [/settings](https://bouncer-delta.vercel.app/settings) cover your name, history, wallet, sound, and tips.

### Check the chain yourself

No account or key is needed. This lists the doors on the vault:

```bash
curl -s https://rpc.testnet.fastnear.com -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":"1","method":"query","params":{"request_type":"call_function","finality":"final","account_id":"bouncer-vault.testnet","method_name":"list_vaults","args_base64":"eyJmcm9tX2luZGV4IjowLCJsaW1pdCI6MjB9"}}'
```

The `result` bytes decode to a JSON list of door ids. `get_vault` with `{"vault_id":"<id>"}` returns that door's pot, round, open flag, commitment, cap, and time lock.

Each door's **Wins** page (`/v/<id>/wins`, linked from the door) does this for every recorded win, in your browser and without our server. It lists the wins from the vault's storage, finds the `submit_verdict` call that recorded each one, checks that the signed verdict equals what the vault stored, and checks the guard's Ed25519 signature against the vault's guard key. Each check shows the `curl` commands to repeat it.

## Rules the code enforces

- A bill matches an unpaid line when the payee and the reference match (case, spaces, and punctuation do not matter) and the total matches to the cent. A paid line never matches. (`guard/src/ledger.rs`)
- A wrong bill gets "Not approved." and no detail. An approval gets "Approved." and nothing the model wrote.
- Six messages per raid. A message and a bill each use one. Listening and the Desk are free.
- Each player gets their own ledger, drawn from the protected seed for that door, round, and player.
- A door pays at most its cap per crack, and only as many cracks as the sponsor allows.
- A door's sponsor and the vault's owner cannot raid that door or be paid from it.
- A win that is not claimed within 7 days returns to the door's pot.
- A sponsor's story must pass the guard's fairness test (each unpaid line must be hard to guess, and a hint may not give away a whole bill) before it can be sealed, and it cannot change after its first round.

## Repository

| Folder | What it is | Tests |
|---|---|---|
| `contracts/vault` | The vault contract | `cargo test` |
| `guard` | The enclave guard | `cargo test` |
| `server` | The relay and keeper | `npm test` |
| `web` | The web app | `npm test` |
| `prototype` | A clickable design reference with invented demo data. It is not the product, and nothing in the product reads it. | none |

## Run it locally

You need Node 22 and, for the contracts, Rust with the `wasm32-unknown-unknown` and `wasm32-wasip2` targets.

```bash
cd web && npm install && npm run dev
```

Fill `web/.env` from `web/env.example`. For testnet: `NEXT_PUBLIC_RPC_URL=https://rpc.testnet.fastnear.com`, `NEXT_PUBLIC_VAULT_CONTRACT_ID=bouncer-vault.testnet`, `NEXT_PUBLIC_NETWORK_ID=testnet`, and `NEXT_PUBLIC_API_URL` pointing at a running relay. Reading doors works without a relay; playing needs one.

```bash
cd server && npm install && npm start
```

Fill `server/.env` from `server/.env.example`. The relay needs a funded relay account, an OutLayer payment key, and the guard version to call. Those values are secrets and stay out of git. `GET /health` answers when it is up, on port 8787 unless `PORT` is set. Running the relay also runs the keeper, which sends testnet transactions when `KEEPER_*` is set.

```bash
cd contracts/vault && cargo build --target wasm32-unknown-unknown --release
cd guard && cargo build --target wasm32-wasip2 --release
```

`contracts/vault/.cargo/config.toml` adds `--cfg near`, which keeps the contract's panic messages. Build through Cargo so it applies.

## Known limits

- Testnet only. tUSDC has no value. Any-coin payout through NEAR Intents is mainnet-only and is not built.
- The conversation with the guard stays on the device that wrote it. Your message count, street hints, and a win follow your passkey to another device.
- A sponsor who raids their own door with a second, unrelated passkey is not caught when the raid opens. The vault still refuses to pay the sponsor's own account.
- The hosted relay and the guard calls are paid by one operator account.

## Built with

- **Web:** Next.js 16.4, React 19.3, Tailwind CSS 4, GSAP 3, near-api-js 7.4, and the `@fast-auth-near` packages.
- **Server:** Hono 4, `@hono/node-server`, near-api-js 7.4, SurrealDB client 2, tsx.
- **Vault:** `near-sdk` 5.30.
- **Guard:** `borsh`, `chacha20poly1305`, `ed25519-dalek`, `hkdf`, `hmac`, `sha2`, `hex`, `serde_json`, running on OutLayer.
- **Services:** OutLayer (enclave execution and attestation), NEAR AI Cloud (model), Vercel, Render, SurrealDB Cloud, FastNear RPC.
- **Sound:** CC0 recordings, credited in `web/public/audio/AUDIO_CREDITS.md`.

All code in this repository was written from 3 November 2026 onward. No earlier project is reused.

## License

Proprietary. All rights reserved. You may view the code, and clone and run it locally to review it. Any other use needs written permission. See [LICENSE](LICENSE).
