import { apiPost } from "./api.ts";
import { deriveSecrets } from "./device-pass.ts";
import { readHold } from "./player-hold.ts";
import type { CrackView } from "./vault.ts";

export type Uncollected = { vaultId: string; round: string; amount: string; ready: boolean };

/** Statuses the vault can still pay out. */
const PAYABLE = new Set(["Reserved", "Settled", "Failed"]);

/**
 * Wins by this browser's signed-in passkey that the vault holds and has not paid. Nothing is asked of a
 * browser that is not signed in, and no passkey prompt is shown: the sign-in already on this browser is used.
 */
export async function uncollected(rounds: { vaultId: string; round: string }[]): Promise<Uncollected[]> {
  const held = await readHold();
  if (!held) return [];
  const found: Uncollected[] = [];
  try {
    for (const { vaultId, round } of rounds.slice(0, 8)) {
      const secrets = await deriveSecrets(held, vaultId, round);
      if ("error" in secrets) continue;
      const sent = await apiPost("/crack", { raid_id: secrets.raidId, vault_id: vaultId, round });
      const body = (sent.ok && sent.status === 200 ? sent.body : null) as { ok?: boolean; crack?: CrackView | null; nowMs?: number } | null;
      const crack = body?.ok ? body.crack : null;
      if (!crack || !PAYABLE.has(crack.status) || typeof body?.nowMs !== "number") continue;
      const nowNs = BigInt(Math.trunc(body.nowMs)) * 1_000_000n;
      if (nowNs > BigInt(crack.expiresAt)) continue;
      found.push({ vaultId, round, amount: crack.amount, ready: nowNs >= BigInt(crack.unlockAt) });
    }
  } finally {
    held.fill(0);
  }
  return found;
}
