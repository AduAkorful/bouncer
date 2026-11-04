import { createHash } from "node:crypto";

export type Mark = { hash: string };

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
    if (current) return { ok: false, error: "second open" };
    return { ok: true };
  }
  if (op === "reveal") return { ok: true };
  if (op !== "say" && op !== "bill") return { ok: false, error: "unknown" };
  if (typeof blob !== "string" || blob.length === 0) return { ok: false, error: "stale blob" };
  if (current && blobHash(blob) !== current.hash) return { ok: false, error: "stale blob" };
  return { ok: true };
}

export function commitTurn(marks: Map<string, Mark>, op: string, key: string, blob: unknown) {
  if ((op === "open" || op === "say" || op === "bill") && typeof blob === "string" && blob.length > 0) {
    marks.set(key, { hash: blobHash(blob) });
  }
}
