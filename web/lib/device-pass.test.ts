import assert from "node:assert/strict";
import test from "node:test";
import { baseDecode } from "near-api-js";
import { deriveSecrets, importClaimKey, keyFromSeed } from "./device-pass.ts";

test("the same passkey bytes rebuild the same account, claim key, and raid", async () => {
  const ikm = new Uint8Array(32).map((_, i) => i + 1);
  const first = await deriveSecrets(ikm, "velvet-1", "1");
  const second = await deriveSecrets(ikm, "velvet-1", "1");
  assert.ok(!("error" in first));
  assert.ok(!("error" in second));
  assert.equal(first.accountPublicKey, second.accountPublicKey);
  assert.equal(first.claimPublicKeyHex, second.claimPublicKeyHex);
  assert.equal(first.raidId, second.raidId);
  assert.notEqual(first.accountPublicKey, first.claimPublicKeyHex);
  assert.equal(first.raidId.length, 32);
});

test("a different round is a different raid id and the same account", async () => {
  const ikm = new Uint8Array(32).map((_, i) => i + 3);
  const one = await deriveSecrets(ikm, "velvet-1", "1");
  const two = await deriveSecrets(ikm, "velvet-1", "2");
  assert.ok(!("error" in one) && !("error" in two));
  assert.equal(one.accountPublicKey, two.accountPublicKey);
  assert.notEqual(one.raidId, two.raidId);
});

test("a short passkey result is refused", async () => {
  const derived = await deriveSecrets(new Uint8Array(16), "velvet-1", "1");
  assert.deepEqual(derived, { error: "passkey" });
});

test("the claim key in the browser matches the key the vault will check", async () => {
  const ikm = new Uint8Array(32).fill(9);
  const secrets = await deriveSecrets(ikm, "velvet-1", "4");
  assert.ok(!("error" in secrets));
  const seed = baseDecode(secrets.claimSecret.slice("ed25519:".length)).slice(0, 32);
  const stored = await importClaimKey(seed);
  const message = new Uint8Array([9, 8, 7]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, stored, message));
  assert.equal(keyFromSeed(seed).verify(message, signature), true);
  assert.equal(keyFromSeed(seed).publicKey.toString().startsWith("ed25519:"), true);
});

test("the account key signs with the seed it was given", () => {
  const seed = new Uint8Array(32).fill(7);
  const key = keyFromSeed(seed);
  const signature = key.sign(new Uint8Array([1, 2, 3]));
  assert.equal(signature.signature.length, 64);
  assert.equal(key.verify(new Uint8Array([1, 2, 3]), signature.signature), true);
});
