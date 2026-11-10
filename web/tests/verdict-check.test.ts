import assert from "node:assert/strict";
import test from "node:test";
import { toHex, verdictBytes, verifyVerdict } from "../lib/verdict-check.ts";

// The same fixture the guard and the vault test against.
const FIXTURE =
  "626f756e6365722e766572646963742e76310800000076656c7665742d31010000000000000006000000726169642d3108000000706c617965722d3111111111111111111111111111111111111111111111111111111111111111118093dc1400000000000000000000000022222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333333333333333626f756e6365722e67756172642e763100000000000000000000000000000000";

const verdict = {
  vault_id: "velvet-1",
  round: 1,
  raid_id: "raid-1",
  player_id: "player-1",
  bill_hash: "11".repeat(32),
  amount: "350000000",
  claim_pk: "22".repeat(32),
  conversation_hash: "33".repeat(32),
  guard_version: `${Buffer.from("bouncer.guard.v1").toString("hex")}${"00".repeat(16)}`,
};

test("the verdict bytes are the ones the guard and the vault build", () => {
  assert.equal(toHex(verdictBytes(verdict)!), FIXTURE);
});

test("a field that is missing or malformed gives no bytes", () => {
  assert.equal(verdictBytes({ ...verdict, amount: "-1" }), null);
  assert.equal(verdictBytes({ ...verdict, bill_hash: "11" }), null);
  assert.equal(verdictBytes({ ...verdict, round: "x" }), null);
  assert.equal(verdictBytes({ ...verdict, vault_id: undefined }), null);
  assert.equal(verdictBytes({ ...verdict, amount: (1n << 128n).toString() }), null);
});

test("a signature checks against the guard key and no other", async () => {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const other = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const bytes = verdictBytes(verdict)!;
  const signature = toHex(new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, new Uint8Array(bytes))));
  const publicKey = toHex(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const otherKey = toHex(new Uint8Array(await crypto.subtle.exportKey("raw", other.publicKey)));
  assert.equal(await verifyVerdict(verdict, signature, publicKey), true);
  assert.equal(await verifyVerdict(verdict, signature, otherKey), false);
  assert.equal(await verifyVerdict({ ...verdict, amount: "350000001" }, signature, publicKey), false);
  assert.equal(await verifyVerdict(verdict, "00", publicKey), null);
  assert.equal(await verifyVerdict(verdict, signature, "zz"), null);
});
