import assert from "node:assert/strict";
import test from "node:test";
import { playerNameToStore } from "../lib/player-name.ts";

test("a typed name keeps letters and numbers, and refuses the rest", () => {
  assert.equal(playerNameToStore("  QuietOkada42  "), "QuietOkada42");
  assert.equal(playerNameToStore("ab"), null);
  assert.equal(playerNameToStore("1Night"), null);
  assert.equal(playerNameToStore("Quiet Okada"), null);
  assert.equal(playerNameToStore("A".repeat(25)), null);
  assert.equal(playerNameToStore(""), null);
});
