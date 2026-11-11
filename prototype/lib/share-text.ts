/**
 * What a player shares after a raid. Squares for each message, the door, and a link to that door.
 * Nothing about the bill goes in: no payee, reference, or amount while the round is open. A paid cut may
 * show its amount, because by then it is already paid.
 */

export type Square = "ask" | "refused" | "approved" | "none";
export type Shared =
  | { kind: "in"; sign: string; guard: string | null; grid: Square[]; streak: number }
  | { kind: "out"; sign: string; guard: string | null; grid: Square[]; streak: number }
  | { kind: "paid"; sign: string; guard: string | null; grid: Square[]; streak: number; amount: string };

const EMOJI: Record<Square, string> = { ask: "⬛", refused: "🟥", approved: "🟪", none: "⬜" };

export function squares(grid: Square[]): string {
  return grid.map((square) => EMOJI[square]).join("");
}

/** The message the bill got in on, counting from one, or null if none did. */
export function winningMessage(grid: Square[]): number | null {
  const at = grid.indexOf("approved");
  return at < 0 ? null : at + 1;
}

export function shareText(shared: Shared, budget: number): string {
  const fire = shared.streak > 1 ? ` 🔥${shared.streak}` : "";
  const guard = shared.guard?.trim();
  const grid = squares(shared.grid);
  if (shared.kind === "out") {
    return `Turned away at ${shared.sign} · ${shared.grid.length}/${budget}${fire}\n${grid}\n${guard ? `Can you get past ${guard}?` : "Can you get past the door?"}`;
  }
  const on = winningMessage(shared.grid);
  const head = shared.kind === "paid" ? `Got paid ${shared.amount} at ${shared.sign}` : `Got in at ${shared.sign}`;
  return `${head}${on ? ` on message ${on}/${budget}` : ""}${fire}\n${grid}\n${guard ? `${guard} let me in. Your turn.` : "Your turn."}`;
}
