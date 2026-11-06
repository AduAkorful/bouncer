import { doorPaths, isVaultId } from "./door-read.ts";

export type RaidHistoryState = "shut" | "opened" | "in";

export type RaidHistoryRow = {
  vaultId: string;
  round: string;
  state: RaidHistoryState;
};

/** A raid summary from one store record. Transcripts, notes, and keys stay out. */
export function raidHistoryRow(key: unknown, value: unknown): RaidHistoryRow | null {
  if (typeof key !== "string" || key.startsWith("transcript:")) return null;
  const split = key.indexOf(":");
  if (split <= 0 || split !== key.lastIndexOf(":")) return null;
  const vaultId = key.slice(0, split);
  const round = key.slice(split + 1);
  if (!isVaultId(vaultId) || !/^[0-9]+$/.test(round)) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as { blob?: unknown; verdict?: unknown };
  const opened = typeof row.blob === "string" && row.blob.length > 0;
  const gotIn = row.verdict !== null && typeof row.verdict === "object";
  return { vaultId, round, state: gotIn ? "in" : opened ? "opened" : "shut" };
}

export function raidHistoryLabel(state: RaidHistoryState): string {
  if (state === "in") return "Got in";
  if (state === "opened") return "Opened";
  return "Not opened";
}

export function raidHistoryHref(row: RaidHistoryRow, defaultVaultId: string): string {
  const paths = row.vaultId === defaultVaultId.trim()
    ? { door: "/home", play: "/play", reveal: "/reveal", claim: "/claim" }
    : doorPaths(row.vaultId);
  if (row.state === "in") return paths.claim;
  if (row.state === "opened") return paths.play;
  return paths.door;
}
