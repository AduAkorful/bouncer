import type { VaultView } from "./vault.ts";

const HIDDEN = new Set(["guard", "reveal", "crack", "rpc", "round", "seed", "missing env", "claim key", "bad request", "unknown", "signature", "commitment", "second open", "stale blob"]);

/** A missing setting. The words never include an environment name. */
export const UNSET = "Nothing on this door was filled in.";

/** The name on a door. A card supplies it. With no card, the vault id is the only name, and there is no bouncer name. */
export function doorTitle(card: { sign: string; name: string } | null | undefined, vaultId: string): { sign: string; name: string | null } {
  const sign = card?.sign.trim() ?? "";
  const name = card?.name.trim() ?? "";
  return {
    sign: sign.length > 0 ? sign : vaultId,
    name: name.length > 0 ? name : null,
  };
}

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

/** Every crack the round allows has been recorded. The vault refuses another, so the door must not sell one. */
export function doorFull(vault: Pick<VaultView, "open" | "crackCount" | "maxCracks">): boolean {
  return vault.open && vault.maxCracks > 0 && vault.crackCount >= vault.maxCracks;
}

const SPONSOR_DETAIL_CODE = "sponsor";
export const SPONSOR_DETAIL = "You sponsor this door, so you cannot raid it: the vault never pays a door's sponsor. Try another door.";

export function playerDetail(error: string): string {
  if (error === "full") return "Tonight's cut has been taken. Nothing is left to win.";
  if (error === SPONSOR_DETAIL_CODE) return SPONSOR_DETAIL;
  if (HIDDEN.has(error)) return "The door did not answer.";
  return error;
}

/** The panel when an open door does not start a raid. A closed queue is a separate panel. */
export function playStop(detail: string): { title: string; detail: string } {
  if (detail === "The door did not answer.") return { title: detail, detail: "The raid stays shut." };
  if (detail === SPONSOR_DETAIL) return { title: "You sponsor this door.", detail };
  return { title: "This device's passkey did not open.", detail };
}

/** A closed door has no stored next opening. The other-doors list is the place to look. */
export const CLOSED_DOOR_NOTE = "This door has no round open. Its sponsor opens the next one. Other doors are listed below.";

/** Play on a door whose round has no crack left. */
export const FULL_QUEUE = {
  kicker: "Taken",
  title: "Tonight's cut is taken.",
  detail: "Someone already got in tonight, so this round has nothing left to win. The next round opens when its sponsor opens it. Other doors are listed below.",
};

/** Closed play. No retry: the queue is shut, and the door page lists any other door. */
export const CLOSED_QUEUE = {
  kicker: "Closed",
  title: "The queue is closed.",
  detail: "This door has no round open tonight. Its sponsor opens the next one. The other doors are listed below.",
};

export const COMMITMENT_LINE = "Ledger committed before the door opened";
export const NO_COMMITMENT = "No commitment is stored on this vault.";

/** A stored hash stays visible after the door shuts. A missing hash stays missing. */
export function commitmentFooter(commitment: string | null | undefined): { hash: string } | { empty: true } {
  if (commitment) return { hash: commitment };
  return { empty: true };
}

/** What the play gate says before a raid exists. The passkey prompt is a separate panel. */
export function playGateStatus(wait: "reading" | "opening"): string {
  return wait === "reading" ? "Reading this browser." : "Opening the door.";
}

/** A stored row with no blob is not a raid. The door never finished opening. */
export function playableRaid<T extends { playerId: string; blob: string | null }>(raid: T | null | { error: string }): T | null | { error: string } {
  if (!raid) return null;
  if (!("playerId" in raid)) return raid;
  if (!raid.blob) return null;
  return raid;
}
