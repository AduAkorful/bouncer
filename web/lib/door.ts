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

export function playerDetail(error: string): string {
  if (HIDDEN.has(error)) return "The door did not answer.";
  return error;
}

/** The panel when an open door does not start a raid. A closed queue is a separate panel. */
export function playStop(detail: string): { title: string; detail: string } {
  if (detail === "The door did not answer.") return { title: detail, detail: "The raid stays shut." };
  return { title: "This device's passkey did not open.", detail };
}

/** A closed door has no stored next opening. The other-doors list is the place to look. */
export const CLOSED_DOOR_NOTE = "No next opening is stored. Other doors are listed below.";

/** Closed play. No retry: the queue is shut, and the door page lists any other door. */
export const CLOSED_QUEUE = {
  kicker: "Closed",
  title: "The queue is closed.",
  detail: "This door is shut. No next opening is stored. The door page lists any other door.",
};

export const COMMITMENT_LINE = "Tonight's ledger committed before the door opened";
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
