import { claimBytes } from "./bytes.ts";

export function claimMessage(vaultId: string, round: bigint, raidId: string, payout: string): Uint8Array {
  return claimBytes(vaultId, round, raidId, payout);
}
