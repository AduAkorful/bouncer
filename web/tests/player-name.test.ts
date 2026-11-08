import assert from "node:assert/strict";
import test from "node:test";
import { generatedPlayerName, playerNameToStore } from "../lib/player-name.ts";

test("a generated name is two words and a number", () => {
  const draws = [0, 0.5, 0.99];
  let index = 0;
  assert.equal(generatedPlayerName(() => draws[index++] ?? 0), "QuietNight99");
});

test("a typed name keeps letters and numbers, and refuses the rest", () => {
  assert.equal(playerNameToStore("  QuietOkada42  "), "QuietOkada42");
  assert.equal(playerNameToStore("ab"), null);
  assert.equal(playerNameToStore("1Night"), null);
  assert.equal(playerNameToStore("Quiet Okada"), null);
  assert.equal(playerNameToStore("A".repeat(25)), null);
  assert.equal(playerNameToStore(""), null);
});
