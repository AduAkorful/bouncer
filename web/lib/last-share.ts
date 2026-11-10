import type { Shared } from "./share-text.ts";

/**
 * The last finished raid on this browser, so /share can show it again. It holds only what the share text
 * holds: the door, the squares, the streak, and an amount once paid. Storage may be missing; then there is nothing.
 */
export type LastShare = Shared & { vaultId: string; budget: number; at: number };

function key(storageName: string) {
  return `${storageName.trim() || "bouncer"}.last-share`;
}

export function writeLastShare(storageName: string, value: LastShare) {
  try {
    window.localStorage.setItem(key(storageName), JSON.stringify(value));
  } catch {
    // A browser that will not store it just has nothing on /share.
  }
}

export function readLastShare(storageName: string): LastShare | null {
  try {
    const raw = window.localStorage.getItem(key(storageName));
    if (!raw) return null;
    const value = JSON.parse(raw) as LastShare;
    if (!value || (value.kind !== "in" && value.kind !== "out" && value.kind !== "paid") || typeof value.sign !== "string" || !Array.isArray(value.grid) || typeof value.vaultId !== "string") return null;
    return value;
  } catch {
    return null;
  }
}
