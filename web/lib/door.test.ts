import assert from "node:assert/strict";
import test from "node:test";
import { closesAtMs, doorShut, playableRaid, playerDetail } from "./door.ts";

const OPEN = "1793577600000000000";

test("the close time is milliseconds when it fits", () => {
  assert.equal(closesAtMs(OPEN), 1_793_577_600_000);
  assert.equal(closesAtMs("nope"), null);
  assert.equal(closesAtMs(`${BigInt(Number.MAX_SAFE_INTEGER) + 1n}000000`), null);
});

test("a past close shuts an open door", () => {
  assert.equal(doorShut({ open: true, closesAt: OPEN }, 1_793_577_600_000), true);
  assert.equal(doorShut({ open: true, closesAt: OPEN }, 1_793_577_600_000 - 1), false);
  assert.equal(doorShut({ open: false, closesAt: OPEN }, 0), true);
  assert.equal(doorShut({ open: true, closesAt: "soon" }, 0), true);
});

test("a player does not see an internal token", () => {
  assert.equal(playerDetail("guard"), "The door did not answer.");
  assert.equal(playerDetail("Not approved."), "Not approved.");
});

test("a row with no blob is not a raid", () => {
  assert.equal(playableRaid(null), null);
  assert.deepEqual(playableRaid({ error: "claim key" }), { error: "claim key" });
  assert.equal(playableRaid({ playerId: "a", blob: null }), null);
  assert.deepEqual(playableRaid({ playerId: "a", blob: "sealed" }), { playerId: "a", blob: "sealed" });
});
