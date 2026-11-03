import { bytesToHex, claimBytes } from "./bytes.ts";

export const CLAIM_FIXTURE = {
  vaultId: "velvet-1",
  round: 1n,
  raidId: "raid-1",
  payout: "alice.testnet",
  hex: "626f756e6365722e636c61696d2e76310800000076656c7665742d31010000000000000006000000726169642d310d000000616c6963652e746573746e6574",
};

export function claimMessage(vaultId: string, round: bigint, raidId: string, payout: string): Uint8Array {
  return claimBytes(vaultId, round, raidId, payout);
}

export function claimFixtureHex(): string {
  const bytes = claimMessage(CLAIM_FIXTURE.vaultId, CLAIM_FIXTURE.round, CLAIM_FIXTURE.raidId, CLAIM_FIXTURE.payout);
  return bytesToHex(bytes);
}
