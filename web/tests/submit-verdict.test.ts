import assert from "node:assert/strict";
import test from "node:test";
import { verdictArgs } from "../lib/submit-verdict.ts";
import { parseVerdictSubmission } from "../lib/verdict-turn.ts";

function guardVerdict(round: unknown) {
  return {
    verdict: {
      vault_id: "qa-coast-05",
      round,
      raid_id: "2e40e6699d8b625d76556d810f1cbf71",
      player_id: "player-1",
      bill_hash: Array.from({ length: 32 }, () => 9),
      amount: "8550000",
      claim_pk: Array.from({ length: 32 }, () => 8),
      conversation_hash: Array.from({ length: 32 }, () => 7),
      guard_version: Array.from({ length: 32 }, () => 6),
    },
    signature: Array.from({ length: 64 }, () => 5),
  };
}

test("the contract gets the round and the amount as JSON numbers", () => {
  for (const round of [5, "5"]) {
    const parsed = parseVerdictSubmission(guardVerdict(round));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = verdictArgs(parsed.verdict, parsed.signature);
    assert.ok(args);
    assert.equal(args.verdict.round, 5);
    assert.match(JSON.stringify(args), /"round":5[,}]/);
    // The contract's amount is a u128 read from a JSON number. A quoted amount panics on deserialize.
    assert.equal(args.verdict.amount, 8550000);
    assert.match(JSON.stringify(args), /"amount":8550000[,}]/);
  }
});

test("a round past the safe integer range is not sent", () => {
  const parsed = parseVerdictSubmission(guardVerdict("9007199254740993"));
  if (!parsed.ok) return;
  assert.equal(verdictArgs(parsed.verdict, parsed.signature), null);
});

test("an amount past the safe integer range is not sent", () => {
  const body = guardVerdict(5);
  body.verdict.amount = "9007199254740993";
  const parsed = parseVerdictSubmission(body);
  if (!parsed.ok) return;
  assert.equal(verdictArgs(parsed.verdict, parsed.signature), null);
});
