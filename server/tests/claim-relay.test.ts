import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { KeyPair, encodeDelegateAction } from "near-api-js";
import { claimDelegate, readClaimBody, type ClaimArgs } from "../../web/lib/claim-relay.ts";
import { createClaimRelay } from "../src/claim-relay.ts";
import { createApp } from "../src/app.ts";
import { testDeps, testEnv } from "./testkit.ts";

const key = KeyPair.fromRandom("ed25519");
const sender = "pabc.relay.test";
const args = (over: Partial<ClaimArgs> = {}): ClaimArgs => ({ vault_id: "anchor", round: 3, raid_id: "ab".repeat(16), payout: sender, claim_sig: Array.from({ length: 64 }, (_, i) => i), ...over });

function body(over: Record<string, unknown> = {}, a: ClaimArgs = args()) {
  const delegate = claimDelegate({ senderId: sender, receiverId: "vault.test", publicKey: key.getPublicKey(), nonce: 7n, maxBlockHeight: 900n, args: a });
  const digest = createHash("sha256").update(encodeDelegateAction(delegate)).digest();
  return { senderId: sender, publicKey: key.getPublicKey().toString(), nonce: "7", maxBlockHeight: "900", args: a, signature: Buffer.from(key.sign(digest).signature).toString("base64"), ...over };
}

test("a well-formed claim body is read, and anything else is refused", () => {
  assert.ok(readClaimBody(body()));
  assert.equal(readClaimBody(null), null);
  assert.equal(readClaimBody(body({ senderId: "UPPER" })), null);
  assert.equal(readClaimBody(body({ nonce: "-1" })), null);
  assert.equal(readClaimBody(body({ signature: "short" })), null);
  assert.equal(readClaimBody(body({}, args({ payout: "someone.else.test" }))), null);
  assert.equal(readClaimBody(body({}, args({ claim_sig: [1, 2, 3] }))), null);
  assert.equal(readClaimBody(body({}, args({ round: 1.5 }))), null);
});

test("the relay refuses a signature that is not the player's key over exactly this claim", async () => {
  const env = testEnv().relay;
  const relay = createClaimRelay({ ...env, contractId: "vault.test" });
  const other = KeyPair.fromRandom("ed25519");
  const stolen = body({ publicKey: other.getPublicKey().toString() });
  assert.deepEqual(await relay(stolen), { ok: false, error: "claim" });
  // A signature made for a different round does not carry over to this one.
  const wrongRound = body({}, args({ round: 3 }));
  wrongRound.args = args({ round: 4 });
  assert.deepEqual(await relay(wrongRound), { ok: false, error: "claim" });
  assert.deepEqual(await relay({ nope: true }), { ok: false, error: "claim" });
});

test("/passkey/claim relays, answers a contract refusal as 422, and is rate limited", async () => {
  const sent: unknown[] = [];
  const { deps } = testDeps({ relayClaim: async (b) => { sent.push(b); return { ok: true, hash: "H" }; } });
  const app = createApp(deps);
  const req = (b: unknown, ip = "1.1.1.1") => app.request("/passkey/claim", { method: "POST", headers: { "content-type": "application/json", origin: "https://site.test", "x-forwarded-for": ip }, body: JSON.stringify(b) });
  const ok = await req(body());
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, hash: "H" });
  assert.equal(sent.length, 1);

  const refused = testDeps({ relayClaim: async () => ({ ok: false, error: "refused", reason: "A door's sponsor or the vault owner cannot be paid from it." }) });
  const res = await createApp(refused.deps).request("/passkey/claim", { method: "POST", headers: { "content-type": "application/json", origin: "https://site.test" }, body: JSON.stringify(body()) });
  assert.equal(res.status, 422);
  assert.equal(((await res.json()) as { reason: string }).reason, "A door's sponsor or the vault owner cannot be paid from it.");

  let last = 200;
  for (let i = 0; i < 22; i += 1) last = (await req(body(), "5.5.5.5")).status;
  assert.equal(last, 429);
});
