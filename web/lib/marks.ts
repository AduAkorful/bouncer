import { createHash } from "node:crypto";

/** `prev` is the blob this one replaced, so a retry after a lost reply is let through. `fresh` is an open the player has not played yet. */
export type Mark = { hash: string; prev?: string; fresh?: boolean };

export function blobHash(blob: string): string {
  return createHash("sha256").update(blob).digest("hex");
}

export function markKey(vaultId: string, round: string, playerId: string): string {
  return `${vaultId}\n${round}\n${playerId}`;
}

/**
 * This process remembers players it has already called for.
 * A different process, or a fresh one, has no row for them. The guard keeps that mark
 * for every player, so a missing row is forwarded. A row that disagrees with the blob is refused here.
 */
export function admitTurn(
  marks: ReadonlyMap<string, Mark>,
  op: string,
  key: string,
  blob: unknown,
): { ok: true } | { ok: false; error: string } {
  const current = marks.get(key);
  if (op === "open") {
    // A reply to `open` can be lost. The guard keeps no mark for an open, and its count stops a reset,
    // so a player who has not played yet may open again.
    if (current && !current.fresh) return { ok: false, error: "second open" };
    return { ok: true };
  }
  if (op === "reveal") return { ok: true };
  if (op !== "say" && op !== "bill") return { ok: false, error: "unknown" };
  if (typeof blob !== "string" || blob.length === 0) return { ok: false, error: "stale blob" };
  if (current) {
    const held = blobHash(blob);
    if (held !== current.hash && held !== current.prev) return { ok: false, error: "stale blob" };
  }
  return { ok: true };
}

export function commitTurn(marks: Map<string, Mark>, op: string, key: string, blob: unknown) {
  if ((op !== "open" && op !== "say" && op !== "bill") || typeof blob !== "string" || blob.length === 0) return;
  const hash = blobHash(blob);
  const current = marks.get(key);
  if (op === "open") {
    marks.set(key, { hash, fresh: true });
    return;
  }
  // A retry answered from the guard's stored reply carries the blob already held. Nothing moves.
  if (current && current.hash === hash) return;
  marks.set(key, { hash, prev: current?.hash });
}
