import assert from "node:assert/strict";
import test from "node:test";
import { lastWord } from "../lib/last-word.ts";

test("the last word names a real rival door, is stable per raid, and never calls it easier", () => {
  const rival = { sign: "LABADI TIDE", guard: "Kofi", pot: "20 USDC" };
  const seeds = ["a", "b", "c", "d", "e", "f", "g", "h", "raid-1", "raid-2"];
  for (const seed of seeds) {
    const line = lastWord(rival, seed);
    assert.ok(line.includes("LABADI TIDE"), line);
    assert.equal(line, lastWord(rival, seed));
    assert.doesNotMatch(line, /\b(easier|weaker|softer|easy)\b/i);
    assert.doesNotMatch(line, /\b(payee|reference|total|amount|quantity)\b/i);
  }
  assert.ok(lastWord({ sign: "SOHO LATES", guard: null, pot: null }, "x").includes("SOHO LATES"));
  assert.ok(lastWord(null, "x").length > 10);
});
