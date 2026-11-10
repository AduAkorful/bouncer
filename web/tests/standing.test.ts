import assert from "node:assert/strict";
import test from "node:test";
import { earned, gapToNext, nextMilestone } from "../lib/standing.ts";

test("milestones follow the nights and the streak, and name the next one", () => {
  assert.deepEqual(earned(0, 0), []);
  assert.deepEqual(earned(1, 0), ["First night in"]);
  assert.deepEqual(earned(3, 3), ["First night in", "Regular · 3 nights in", "3-day streak"]);
  assert.equal(nextMilestone(0, 0), "Next: First night in.");
  assert.equal(nextMilestone(10, 7), null);
});

test("the gap names the player above and what passes them; ties share the nearest higher place", () => {
  const rows = [
    { name: "A", place: 1, nights: 5, streak: 2 },
    { name: "B", place: 2, nights: 3, streak: 4 },
    { name: "C", place: 3, nights: 3, streak: 1 },
    { name: "D", place: 4, nights: 3, streak: 1 },
  ];
  assert.equal(gapToNext(rows, "A"), "You are first. Keep the streak going to stay there.");
  assert.equal(gapToNext(rows, "B"), "2 more nights in passes A.");
  assert.equal(gapToNext(rows, "C"), "3 more streak days passes B.");
  assert.equal(gapToNext(rows, "Z"), null);
});
