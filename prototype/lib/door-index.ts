import type { Card } from "./card";

export type ListedDoor = {
  id: string;
  href: string;
  sign: string;
  name: string;
  line: string;
  /** True when this vault is shut, suspended, or could not be read. */
  shut: boolean;
  sponsored: boolean;
  /** False when this vault's own read failed. The id still came from the chain. */
  read: boolean;
  card: Card | null;
  /** Tonight's pot in base units, the round, and the close. Null when the vault was not read. */
  dayPot: string | null;
  round: string | null;
  closesAt: string | null;
};

/** The door a plain URL should open. An open vault wins, and among open vaults the biggest pot tonight. */
export function frontDoor(doors: ListedDoor[]): ListedDoor | null {
  const readable = doors.filter((door) => door.read);
  let best: ListedDoor | null = null;
  for (const door of readable) {
    if (door.shut) continue;
    if (!best || potOf(door) > potOf(best)) best = door;
  }
  return best ?? readable[0] ?? null;
}

export function doorCandidates(doors: ListedDoor[]): ListedDoor[] {
  return orderDoors(doors.filter((door) => door.read));
}

/** Open doors first, biggest pot first among them. Closed and unread doors keep chain order after. */
export function orderDoors(doors: ListedDoor[]): ListedDoor[] {
  const open = doors.filter((door) => !door.shut).sort((a, b) => (potOf(b) > potOf(a) ? 1 : potOf(b) < potOf(a) ? -1 : 0));
  return [...open, ...doors.filter((door) => door.shut)];
}

function potOf(door: ListedDoor): bigint {
  return door.dayPot && /^[0-9]+$/.test(door.dayPot) ? BigInt(door.dayPot) : 0n;
}
