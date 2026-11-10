import assert from "node:assert/strict";
import test from "node:test";
import { shareText, winningMessage } from "../lib/share-text.ts";

test("a win shares the door, the message it got in on, and the squares, and nothing about the bill", () => {
  const text = shareText({ kind: "in", sign: "LABADI TIDE", guard: "Kofi", grid: ["ask", "refused", "approved"], streak: 2 }, 6);
  assert.equal(text, "Got in at LABADI TIDE on message 3/6 🔥2\n⬛🟥🟪\nKofi let me in. Your turn.");
  assert.doesNotMatch(text, /USDC|[0-9]+\.[0-9]/);
  assert.equal(winningMessage(["ask", "ask"]), null);
});

test("a turned-away raid dares the reader, and a paid cut may show its amount", () => {
  assert.equal(
    shareText({ kind: "out", sign: "SOHO LATES", guard: null, grid: ["ask", "refused", "refused", "ask", "refused", "refused"], streak: 1 }, 6),
    "Turned away at SOHO LATES · 6/6\n⬛🟥🟥⬛🟥🟥\nCan you get past the door?",
  );
  assert.match(shareText({ kind: "paid", sign: "OSU AFTER DARK", guard: "Efua", grid: ["approved"], streak: 3, amount: "1.18 USDC" }, 6), /^Got paid 1\.18 USDC at OSU AFTER DARK on message 1\/6 🔥3/);
});
