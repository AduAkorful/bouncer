import assert from "node:assert/strict";
import test from "node:test";
import { buildCard, cardLook, parseCard } from "../lib/card.ts";

const card = {
  sign: "THE RUSTY ANCHOR",
  name: "Auntie Ama",
  pitch: "We owe the fishermen. Prove it.",
  look: { build: 1, skin: 2, head: 3, outfit: 1, eyewear: 2 },
  setting: { stall: 0, ride: 0, passer: 0, seller: 0, shop: 0, weather: 0, posters: 0, sound: 0, place: 0, crowd: 0 },
};

test("a card round trips", () => {
  const built = buildCard(card, 600);
  assert.ok(built.ok);
  const parsed = parseCard(built.ok ? built.text : "");
  assert.deepEqual(parsed, { ok: true, card });
});

test("a card is refused when its text breaks the rules", () => {
  for (const bad of [
    { ...card, sign: "" },
    { ...card, sign: "lower case" },
    { ...card, sign: "A".repeat(25) },
    { ...card, name: "<script>" },
    { ...card, pitch: "" },
    { ...card, pitch: "x".repeat(161) },
    { ...card, pitch: "go to <a href=x>here</a>" },
    { ...card, pitch: "bad\u0007bell" },
  ]) {
    assert.equal(buildCard(bad, 600).ok, false);
  }
  assert.equal(buildCard(card, 20).ok, false);
});

test("a stored card that is not ours does not parse", () => {
  assert.deepEqual(parseCard(null), { ok: false });
  assert.deepEqual(parseCard("not json"), { ok: false });
  assert.deepEqual(parseCard("[]"), { ok: false });
  assert.deepEqual(parseCard(JSON.stringify({ v: 2, ...card })), { ok: false });
  assert.deepEqual(parseCard(JSON.stringify({ v: 1, sign: "ok", name: "<b>", pitch: "x", look: {} })), { ok: false });
});

test("a look outside its list falls back, and an earned outfit cannot be asked for", () => {
  const wild = JSON.stringify({ v: 1, sign: "OK", name: "Sam", pitch: "x", look: { build: 99, skin: -1, head: "a", outfit: 4, eyewear: 7 } });
  const parsed = parseCard(wild);
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.deepEqual(parsed.card.look, { build: 0, skin: 1, head: 0, outfit: 0, eyewear: 0 });
    assert.equal(cardLook(parsed.card).outfit, "suit");
  }
});

test("a card draws a guard with the card's own name", () => {
  const look = cardLook(card);
  assert.equal(look.name, "Auntie Ama");
  assert.equal(look.build, "stocky");
});
