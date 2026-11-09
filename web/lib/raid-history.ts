import { doorPaths, isVaultId } from "./door-read.ts";

export type RaidHistoryState = "shut" | "opened" | "held" | "stuck" | "in";

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
  const row = value as { blob?: unknown; verdict?: unknown; signature?: unknown; transactionHash?: unknown; recorded?: unknown };
  const opened = typeof row.blob === "string" && row.blob.length > 0;
  const approved = row.verdict !== null && typeof row.verdict === "object";
  // An approved bill is only "in" once the vault has recorded it.
  const recorded = row.recorded === true || (typeof row.transactionHash === "string" && row.transactionHash.length > 0);
  // Without the guard's signature an approval cannot be sent again, so it is not offered as held.
  const signed = typeof row.signature === "string" && row.signature.length > 0;
  const state = approved ? (recorded ? "in" : signed ? "held" : "stuck") : opened ? "opened" : "shut";
  return { vaultId, round, state };
}

const RANK: Record<RaidHistoryState, number> = { shut: 0, opened: 1, stuck: 2, held: 3, in: 4 };

/**
 * One list from this browser's raids and the server's nights. The server knows every browser this passkey
 * played on; this browser knows what is still held here. For the same round, the further state wins.
 */
export function mergeHistory(device: RaidHistoryRow[], server: { vaultId: string; round: string; state: "opened" | "in" }[]): RaidHistoryRow[] {
  const rows = new Map<string, RaidHistoryRow>();
  for (const row of device) rows.set(`${row.vaultId}:${row.round}`, row);
  for (const night of server) {
    if (!isVaultId(night.vaultId) || !/^[0-9]+$/.test(night.round)) continue;
    const key = `${night.vaultId}:${night.round}`;
    const known = rows.get(key);
    if (!known || RANK[night.state] > RANK[known.state]) rows.set(key, { vaultId: night.vaultId, round: night.round, state: night.state });
  }
  return [...rows.values()].sort((a, b) => (a.vaultId === b.vaultId ? Number(b.round) - Number(a.round) : a.vaultId.localeCompare(b.vaultId)));
}

export function raidHistoryLabel(state: RaidHistoryState): string {
  if (state === "in") return "Got in";
  if (state === "held") return "Approved, not recorded";
  if (state === "stuck") return "Approved, cannot be sent";
  if (state === "opened") return "Opened";
  return "Not opened";
}

/**
 * A win links to the claim for its own round. An opened raid links to that round's ledger, which says whether
 * the round is still open. A raid that never opened links to the door.
 */
export function raidHistoryHref(row: RaidHistoryRow): string {
  const paths = doorPaths(row.vaultId);
  if (row.state === "in" || row.state === "held" || row.state === "stuck") return `${paths.claim}?round=${row.round}`;
  if (row.state === "opened") return `${paths.reveal}?round=${row.round}`;
  return paths.door;
}
