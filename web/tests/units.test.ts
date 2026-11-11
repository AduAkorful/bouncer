import assert from "node:assert/strict";
import test from "node:test";
import { formatAtomic } from "../lib/units.ts";

test("an amount with one decimal place reads in cents, and a whole amount stays whole", () => {
  assert.equal(formatAtomic("2400000", 6), "2.40");
  assert.equal(formatAtomic("14260000", 6), "14.26");
  assert.equal(formatAtomic("20000000", 6), "20");
  assert.equal(formatAtomic("1", 6), "0.000001");
  assert.equal(formatAtomic("0", 6), "0");
});
