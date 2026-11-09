/** The server's record of this player's nights, shared from the name card to the history list on the same page. */

export type ServerNight = { vaultId: string; round: string; state: "opened" | "in" };

let last: ServerNight[] | null = null;
const listeners = new Set<(nights: ServerNight[]) => void>();

export function publishNights(nights: ServerNight[]) {
  last = nights;
  for (const listener of listeners) listener(nights);
}

/** Calls back at once with what is already known, then on every change. */
export function subscribeNights(listener: (nights: ServerNight[]) => void): () => void {
  listeners.add(listener);
  if (last) listener(last);
  return () => listeners.delete(listener);
}
