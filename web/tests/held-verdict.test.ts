import assert from "node:assert/strict";
import test from "node:test";
import type { ApiResult } from "../lib/api.ts";
import { heldRefusal, heldVerdict, submitHeld } from "../lib/held-verdict.ts";

const hex = (n: number, byte = "ab") => byte.repeat(n);
const verdict = {
  vault_id: "qa-coast-05",
  round: 5,
  raid_id: "raid-1",
  player_id: "player-1",
  bill_hash: hex(32),
  amount: "8550000",
  claim_pk: hex(32),
  conversation_hash: hex(32),
  guard_version: hex(32),
};
const raid = { verdict, signature: hex(64, "cd"), transactionHash: null };

type Call = { path: string; body: unknown };
function poster(replies: Record<string, ApiResult[]>) {
  const calls: Call[] = [];
  const post = async (path: string, body: unknown) => {
    calls.push({ path, body });
    const queue = replies[path] ?? [];
    return queue.shift() ?? { ok: false as const, error: "network" };
  };
  return { post, calls };
}
const reply = (status: number, body: unknown): ApiResult => ({ ok: true, status, body });

test("a verdict with its signature and no transaction is held", () => {
  assert.ok(heldVerdict(raid));
  assert.equal(heldVerdict({ ...raid, transactionHash: "tx" }), null);
  assert.equal(heldVerdict({ ...raid, recorded: true }), null);
  assert.equal(heldVerdict({ ...raid, signature: undefined }), null);
  assert.equal(heldVerdict({ ...raid, verdict: null }), null);
  assert.equal(heldVerdict(null), null);
});

test("a recorded verdict returns its transaction and sends byte arrays", async () => {
  const { post, calls } = poster({ "/verdict": [reply(200, { ok: true, transactionHash: "tx-1" })] });
  const outcome = await submitHeld(heldVerdict(raid)!, "raid-1", "qa-coast-05", post);
  assert.deepEqual(outcome, { ok: true, transactionHash: "tx-1" });
  assert.equal(calls.length, 1);
  const sent = calls[0].body as { verdict: { bill_hash: unknown }; signature: unknown };
  assert.ok(Array.isArray(sent.verdict.bill_hash));
  assert.ok(Array.isArray(sent.signature));
});

test("a failed send is not a win, and can be sent again", async () => {
  const { post } = poster({ "/verdict": [reply(502, { ok: false, error: "rpc" })], "/crack": [reply(200, { ok: true, crack: null })] });
  const outcome = await submitHeld(heldVerdict(raid)!, "raid-1", "qa-coast-05", post);
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.retry, true);
  assert.doesNotMatch(outcome.message, /rpc/);
});

test("a refusal after an earlier send landed reads as recorded", async () => {
  const { post } = poster({ "/verdict": [reply(502, { ok: false, error: "rpc" })], "/crack": [reply(200, { ok: true, crack: { amount: "8550000" } })] });
  assert.deepEqual(await submitHeld(heldVerdict(raid)!, "raid-1", "qa-coast-05", post), { ok: true, transactionHash: null });
});

test("a closed round is not offered again", async () => {
  const { post } = poster({ "/verdict": [reply(409, { ok: false, error: "vault" })], "/crack": [reply(200, { ok: true, crack: null })] });
  const outcome = await submitHeld(heldVerdict(raid)!, "raid-1", "qa-coast-05", post);
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.retry, false);
});

test("an unreadable verdict is not sent", async () => {
  const { post, calls } = poster({});
  const broken = { ...raid, verdict: { ...verdict, bill_hash: "zz" } };
  const outcome = await submitHeld(heldVerdict(broken)!, "raid-1", "qa-coast-05", post);
  assert.equal(outcome.ok, false);
  assert.equal(calls.length, 0);
});

test("a contract refusal says why and is not offered again", async () => {
  const { post, calls } = poster({
    "/verdict": [reply(422, { ok: false, error: "refused", reason: "Smart contract panicked: not open" })],
    "/crack": [reply(200, { ok: true, crack: null })],
  });
  const outcome = await submitHeld(heldVerdict(raid)!, "raid-1", "qa-coast-05", post);
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.retry, false);
  assert.equal(outcome.refused, true);
  assert.match(outcome.message, /^The round is not open\. Sending it again will not change that\.$/);
  assert.equal(calls.filter((c) => c.path === "/verdict").length, 1);
});

test("a stored refusal is read back, an empty one is not", () => {
  assert.equal(heldRefusal({ refused: "The round is not open." }), "The round is not open.");
  assert.equal(heldRefusal({ refused: "" }), null);
  assert.equal(heldRefusal({ refused: null }), null);
  assert.equal(heldRefusal(null), null);
});
