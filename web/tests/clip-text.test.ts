import assert from "node:assert/strict";
import test from "node:test";
import { clipText } from "../lib/clip-text.ts";

test("a share card's text stops at a sentence, or at a word with an ellipsis, never mid-word", () => {
  assert.equal(clipText("Short.", 120), "Short.");
  assert.equal(clipText("A beach club on carnival night. Bia on the rope. Someone owes the band for the set.", 60), "A beach club on carnival night. Bia on the rope.");
  assert.equal(clipText("One long sentence with no stop that keeps going well past the limit here", 30), "One long sentence with no…");
});
