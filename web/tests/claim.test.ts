import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_FIXTURE, claimFixtureHex } from "../lib/claim.ts";

test("claim bytes match the vault fixture", () => {
  assert.equal(claimFixtureHex(), CLAIM_FIXTURE.hex);
});
