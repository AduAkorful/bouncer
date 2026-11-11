import assert from "node:assert/strict";
import test from "node:test";
import { readStreet } from "../lib/street.ts";

test("a street note keeps payees, the poster, and overheard lines", () => {
  const street = readStreet({
    payees: ["Table deposit refund"],
    poster: ["SAT · K-NOVA"],
    queue: [{ who: "Green dress", lines: [{ text: "Booking T-42, refund 10.00.", note: "Table deposit refund · T-42 · 10.00" }] }],
  });
  assert.equal(street?.queue[0]?.lines[0]?.note, "Table deposit refund · T-42 · 10.00");
});

test("a street with no overheard line is dropped", () => {
  assert.equal(readStreet({ payees: ["DJ K-Nova"], poster: [], queue: [] }), null);
  assert.equal(readStreet(null), null);
});

test("a door's own questions come through for the raid to offer, and bad ones are dropped", () => {
  const base = { payees: ["Shinjuku Ice Works"], poster: [], queue: [{ who: "Bar back", lines: [{ text: "t", note: "n" }] }] };
  assert.deepEqual(readStreet({ ...base, asks: ["What's the going rate tonight?", 3, ""] })?.asks, ["What's the going rate tonight?"]);
  assert.equal(readStreet(base)?.asks, undefined);
});
