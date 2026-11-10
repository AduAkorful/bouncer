# Bouncer design prototype (not the product)

This folder is a clickable design spec made before the product was built. Every screen runs on invented demo data in `lib/demo/`. It makes no network call, holds no key, spends nothing, and imports nothing from `web/`.

It is kept only as the visual reference for the demo video. The game that players use is `web/` (screens), `server/` (relay and keeper), `guard/` (the door's rules and the signed verdict, run in an enclave) and `contracts/vault/` (the pot and the payout). None of them reads anything from this folder.

Run it with `npm install && npm run dev` (port 3210).
