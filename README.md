# Bouncer

Bouncer is a testnet door game set on an Accra street. A venue owes money on a hidden list. You listen, talk to the guard, and submit a bill: a payee, a reference, and a total. A wrong bill gets one answer, "Not approved.", and no hint about which field failed. Six messages include the bills. Street talk and the Desk are free.

Prizes are testnet tokens paid by the vault contract. They have no cash value. The model holds no key that can pay.

The hosted game is [https://bouncer-delta.vercel.app](https://bouncer-delta.vercel.app).

## Play a round

1. Open a door. The default door is `/home`, vault id `velvet-1`. A sponsor door is `/v/<vault id>`.
2. If the page says the door could not be read, choose Try again. That is a failed read. The door was not closed.
3. If the page says the queue is closed, that door is shut and no next opening is stored. The door page lists any other door. Practice is not a second game.
4. On an open door, this browser asks for its passkey. The passkey stays on the device.
5. Listen on the street, then spend the six messages on the guard and the bill.
6. After the round closes, Last night's door can reveal that raid's ledger. A win can be claimed after the vault's time lock, from an existing testnet account whose full-access key is this passkey.

## What pays, and what only talks

| Piece | Account | Job |
|---|---|---|
| Vault contract | `bouncer-vault.testnet` on NEAR testnet | Pot, round, open flag, ledger commitment, and payout. This is the only payer. |
| Guard | `aduakorful-door.testnet/guard` | Talks to the player and signs a verdict. It cannot pay. |
| Relay | `https://bouncer-server.onrender.com` | Forwards a raid to the guard. It does not hold the vault's payout key. |
| Web app | the hosted site above | Draws the door and stores this browser's raid. A failed read stays empty. |

Street people give clues. They do not hold wallets or stock.

A read-only check of the default vault, with no account and no key:

```bash
curl -s https://rpc.testnet.fastnear.com \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"query","params":{"request_type":"call_function","finality":"final","account_id":"bouncer-vault.testnet","method_name":"get_vault","args_base64":"eyJ2YXVsdF9pZCI6InZlbHZldC0xIn0="}}'
```

`args_base64` is `{"vault_id":"velvet-1"}`. The result is base64 JSON. An empty result means that vault id is not on the contract.

## Run the web app

From `web/`:

```bash
npm ci
cp env.example .env
npm run dev
```

Fill `web/.env` from `web/env.example`. Leave the values out of git. The names the hosted game uses are `NEXT_PUBLIC_RPC_URL=https://rpc.testnet.fastnear.com`, `NEXT_PUBLIC_VAULT_CONTRACT_ID=bouncer-vault.testnet`, and `NEXT_PUBLIC_NETWORK_ID=testnet`. Point `NEXT_PUBLIC_API_URL` at a running relay (`http://localhost:8787` on this machine). The door shows the token's own symbol when that read succeeds.

`npm test` runs the unit tests. `npx tsc --noEmit` typechecks.

## Run the relay

From `server/`:

```bash
npm ci
cp .env.example .env
npm start
```

Fill `server/.env` from `server/.env.example`. The relay needs the same vault account, `NEAR_RPC_URL=https://rpc.testnet.fastnear.com`, a relay account, and the guard call settings. Those values stay out of git. `GET /health` answers when it is up. The local port is `8787` unless `PORT` is set.

## Contract and guard source

`contracts/vault` is the NEAR contract. `cargo test` runs inside that directory. `guard` is the enclave guest. `cargo test` runs inside that directory. The contract already on testnet is `bouncer-vault.testnet`. These steps do not deploy it and do not call the factory.

`prototype/` is an earlier clickable spec with demo data. It is not the hosted game.

## Not in this repository

A public proof video is not recorded yet. It has to be one real round on the hosted site: a question, a clue, a bill, the outcome, and a read-only vault check. Any-coin payout is labelled for mainnet and does not run on testnet.
