import assert from "node:assert/strict";
import test from "node:test";
import { usesSamplePayee } from "../lib/sample-spec.ts";

const spec = (payee: string) => ({ lines: [{ payee }] });

test("a sample payee is caught however it is spaced, cased or punctuated", () => {
  for (const payee of ["Coastline Drinks", "Coastline  Drinks", "coastline-drinks", "COASTLINE DRINKS LTD", "Tunde. Adeyemi", "Coast"]) {
    assert.equal(usesSamplePayee(spec(payee)), true, payee);
  }
});

test("a payee of the sponsor's own is not a sample payee", () => {
  for (const payee of ["Shinjuku Ice Works", "Drinks Co", "Ade"]) assert.equal(usesSamplePayee(spec(payee)), false, payee);
  assert.equal(usesSamplePayee({}), false);
});
