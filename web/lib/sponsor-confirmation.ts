import { doorShut } from "./door.ts";
import type { VaultView } from "./vault.ts";

export type VaultChange = { keeper: string | null } | { round: string; commitment: string };

type VaultRead = { ok: true; vault: VaultView | null } | { ok: false };

/** Verify a submitted action against finalized reads. This never submits a transaction. */
export async function confirmSponsorVault(
  read: (signal: AbortSignal) => Promise<VaultRead>,
  expected: VaultChange,
  isCurrent: () => boolean,
  { timeoutMs = 12_000, intervalMs = 600 } = {},
): Promise<VaultView | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  while (isCurrent() && !signal.aborted) {
    const result = await read(signal);
    if (!isCurrent() || signal.aborted) break;
    const vault = result.ok ? result.vault : null;
    if (vault && ("keeper" in expected
      ? vault.keeper === expected.keeper
      : vault.round === expected.round && vault.commitment === expected.commitment && !doorShut(vault, Date.now()))) {
      return vault;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
