import assert from "node:assert/strict";
import test from "node:test";
import { CLOSED_DOOR_NOTE, CLOSED_QUEUE, COMMITMENT_LINE, NO_COMMITMENT, closesAtMs, commitmentFooter, doorFull, doorNeverOpened, doorShut, doorTitle, playableRaid, playerDetail, playGateStatus, playStop } from "../lib/door.ts";

const OPEN = "1793577600000000000";

test("a door with no card is named by its vault id", () => {
  assert.deepEqual(doorTitle(null, "velvet-1"), { sign: "velvet-1", name: null });
  assert.deepEqual(doorTitle({ sign: "  ", name: "  " }, "velvet-1"), { sign: "velvet-1", name: null });
  assert.deepEqual(doorTitle({ sign: "COASTLINE NIGHT", name: "Kwame" }, "qa-coast-05"), { sign: "COASTLINE NIGHT", name: "Kwame" });
});

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

test("an open door that does not start says why", () => {
  assert.deepEqual(playStop("The door did not answer."), { title: "The door did not answer.", detail: "The raid stays shut." });
  assert.deepEqual(playStop("The passkey was cancelled."), { title: "This device's passkey did not open.", detail: "The passkey was cancelled." });
});

test("a shut door keeps a stored commitment", () => {
  const hash = "ab".repeat(32);
  assert.deepEqual(commitmentFooter(hash), { hash });
  assert.equal(COMMITMENT_LINE, "Ledger committed before the door opened");
  assert.deepEqual(commitmentFooter(null), { empty: true });
  assert.deepEqual(commitmentFooter(undefined), { empty: true });
  assert.equal(NO_COMMITMENT, "No commitment is stored on this vault.");
});

test("a closed door names no opening time", () => {
  assert.equal(CLOSED_DOOR_NOTE, "This door has no round open. Its sponsor opens the next one. Other doors are listed below.");
  assert.deepEqual(CLOSED_QUEUE, {
    kicker: "Closed",
    title: "The queue is closed.",
    detail: "This door has no round open tonight. Its sponsor opens the next one. The other doors are listed below.",
  });
});

test("the play gate reads this browser before it opens the door", () => {
  assert.equal(playGateStatus("reading"), "Reading this browser.");
  assert.equal(playGateStatus("opening"), "Opening the door.");
});

test("a row with no blob is not a raid", () => {
  assert.equal(playableRaid(null), null);
  assert.deepEqual(playableRaid({ error: "claim key" }), { error: "claim key" });
  assert.equal(playableRaid({ playerId: "a", blob: null }), null);
  assert.deepEqual(playableRaid({ playerId: "a", blob: "sealed" }), { playerId: "a", blob: "sealed" });
});

test("a round with no crack left is full, and a round with room is not", () => {
  const base = { open: true, crackCount: 1, maxCracks: 1 };
  assert.equal(doorFull(base), true);
  assert.equal(doorFull({ ...base, maxCracks: 2 }), false);
  assert.equal(doorFull({ ...base, open: false }), false);
  assert.equal(doorFull({ open: true, crackCount: 0, maxCracks: 0 }), false);
});

test("a door that never opened is told apart from one that closed", () => {
  assert.equal(doorNeverOpened({ open: false, opensAt: "0", commitment: null }), true);
  assert.equal(doorNeverOpened({ open: false, opensAt: "1793577600000000000", commitment: "ab" }), false);
  assert.equal(doorNeverOpened({ open: true, opensAt: "0", commitment: null }), false);
});

test("the server's closed answer reads as a closed round", () => {
  assert.match(playerDetail("closed"), /closed/);
});
