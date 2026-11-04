import type { VaultView } from "./vault.ts";

const HIDDEN = new Set(["guard", "reveal", "crack", "rpc", "round", "seed", "missing env", "claim key", "bad request", "unknown", "signature", "commitment", "second open", "stale blob"]);

/** A missing setting. The words never include an environment name. */
export const UNSET = "Nothing on this door was filled in.";

export function closesAtMs(closesAt: string): number | null {
  if (!/^[0-9]+$/.test(closesAt)) return null;
  try {
    const ms = Number(BigInt(closesAt) / 1_000_000n);
    return Number.isSafeInteger(ms) ? ms : null;
  } catch {
    return null;
  }
}

/** Shut when the contract says so, when the close time has passed, or when that time cannot be read. */
export function doorShut(vault: Pick<VaultView, "open" | "closesAt">, nowMs: number): boolean {
  if (!vault.open) return true;
  const ms = closesAtMs(vault.closesAt);
  if (ms === null) return true;
  return nowMs >= ms;
}

export function playerDetail(error: string): string {
  if (HIDDEN.has(error)) return "The door did not answer.";
  return error;
}

/** A stored row with no blob is not a raid. The door never finished opening. */
export function playableRaid<T extends { playerId: string; blob: string | null }>(raid: T | null | { error: string }): T | null | { error: string } {
  if (!raid) return null;
  if (!("playerId" in raid)) return raid;
  if (!raid.blob) return null;
  return raid;
}
