import assert from "node:assert/strict";
import test from "node:test";
import { baseEncode, PublicKey } from "near-api-js";
import { deriveSecrets } from "./device-pass.ts";
import { playerHeader } from "./player-session.ts";

test("a sign-in header carries the name key without a Node buffer", async () => {
  const secrets = await deriveSecrets(new Uint8Array(32).fill(4), "account", "0");
  assert.ok(!("error" in secrets));
  const header = playerHeader(secrets, "/player/session");
  const parts = header.split("|");
  assert.equal(parts.length, 6);
  const [publicKey, claimKey, seconds, nonce, accountSig, claimSig] = parts;
  assert.match(accountSig, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.match(claimSig, /^[A-Za-z0-9+/]+={0,2}$/);
  const message = new TextEncoder().encode(`bouncer.player.v1|/player/session|${seconds}|${nonce}`);
  const accountBytes = Uint8Array.from(atob(accountSig), (char) => char.charCodeAt(0));
  const claimBytes = Uint8Array.from(atob(claimSig), (char) => char.charCodeAt(0));
  assert.equal(PublicKey.fromString(publicKey).verify(message, accountBytes), true);
  const claimPublic = `ed25519:${baseEncode(Uint8Array.from(claimKey.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16)))}`;
  assert.equal(PublicKey.fromString(claimPublic).verify(message, claimBytes), true);
});
