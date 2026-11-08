import assert from "node:assert/strict";
import test from "node:test";
import { REPLAY_BILL, REPLAY_STEPS } from "../lib/replay-sample.ts";

test("the sample names the quantity, then refuses the same bill", () => {
  assert.equal(REPLAY_BILL.includes("INV-2210"), false);
  assert.equal(REPLAY_STEPS[0]?.mark, "Leak");
  assert.equal(REPLAY_STEPS[0]?.reply, "The quantity doesn't match.");
  assert.notEqual(REPLAY_STEPS[0]?.reply, "Not approved.");
  assert.equal(REPLAY_STEPS[1]?.mark, "Patched");
  assert.equal(REPLAY_STEPS[1]?.reply, "Not approved.");
  assert.equal(REPLAY_STEPS.length, 2);
});
