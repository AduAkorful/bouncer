import assert from "node:assert/strict";
import test from "node:test";
import { readStreet } from "./street.ts";

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
