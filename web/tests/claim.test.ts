import assert from "node:assert/strict";
import test from "node:test";
import { claimMessage } from "../lib/claim.ts";
import { bytesToHex } from "../lib/bytes.ts";

export const CLAIM_FIXTURE = {
  vaultId: "velvet-1",
  round: 1n,
  raidId: "raid-1",
  payout: "alice.testnet",
  hex: "626f756e6365722e636c61696d2e76310800000076656c7665742d31010000000000000006000000726169642d310d000000616c6963652e746573746e6574",
};

function claimFixtureHex(): string {
  return bytesToHex(claimMessage(CLAIM_FIXTURE.vaultId, CLAIM_FIXTURE.round, CLAIM_FIXTURE.raidId, CLAIM_FIXTURE.payout));
}


test("claim bytes match the vault fixture", () => {
  assert.equal(claimFixtureHex(), CLAIM_FIXTURE.hex);
});
