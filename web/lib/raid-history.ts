import { doorPaths, isVaultId } from "./door-read.ts";

export type RaidHistoryState = "shut" | "opened" | "held" | "in";

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
  const row = value as { blob?: unknown; verdict?: unknown; transactionHash?: unknown; recorded?: unknown };
  const opened = typeof row.blob === "string" && row.blob.length > 0;
  const approved = row.verdict !== null && typeof row.verdict === "object";
  // An approved bill is only "in" once the vault has recorded it.
  const recorded = row.recorded === true || (typeof row.transactionHash === "string" && row.transactionHash.length > 0);
  const state = approved ? (recorded ? "in" : "held") : opened ? "opened" : "shut";
  return { vaultId, round, state };
}

export function raidHistoryLabel(state: RaidHistoryState): string {
  if (state === "in") return "Got in";
  if (state === "held") return "Approved, not recorded";
  if (state === "opened") return "Opened";
  return "Not opened";
}

/** A win links to the claim for its own round. Anything else links to the door, which knows whether that round is still open. */
export function raidHistoryHref(row: RaidHistoryRow): string {
  const paths = doorPaths(row.vaultId);
  if (row.state === "in" || row.state === "held") return `${paths.claim}?round=${row.round}`;
  return paths.door;
}
