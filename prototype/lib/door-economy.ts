import type { VaultView } from "./vault";

/**
 * Plan 81. A door's money, as the vault holds it right now. Every number is a field of `get_vault`; nothing is
 * totalled or estimated, because the vault keeps no history of deposits or payouts.
 */

export type EconomyTile = { id: "reserve" | "tonight" | "held"; label: string; atomic: string; note: string };

export type DoorEconomy = {
  tiles: EconomyTile[];
  /** Pay-the-bill only: what one crack can pay and how many are taken. Null on a split-the-day door. */
  cracks: { capAtomic: string; taken: number; max: number } | null;
  steps: string[];
};

/** `shut` is the page's own reading (lib/door doorShut): a round past its close is shut even before the keeper closes it. */
export function doorEconomy(vault: VaultView, shut: boolean): DoorEconomy {
  const split = vault.rule === "SplitTheDay";
  return {
    tiles: [
      // vault ft_on_transfer: a sponsor's deposit lands in `pot`.
      { id: "reserve", label: "In reserve", atomic: vault.pot, note: "Funded by the sponsor. Each round draws from it." },
      // vault commit_round: min(max_cracks × cap, pot) moves to `day_pot`, or the whole reserve on a split-the-day door.
      { id: "tonight", label: "Tonight's pot", atomic: vault.dayPot, note: shut ? "This round is over. It goes back to the reserve when it is closed." : "What this round can pay out." },
      // vault submit_verdict reserves a win's amount; claim pays it, expire returns it.
      { id: "held", label: "Held for winners", atomic: vault.reserved, note: "Wins waiting for their time lock or their claim." },
    ],
    cracks: split ? null : { capAtomic: vault.cap, taken: vault.crackCount, max: vault.maxCracks },
    steps: [
      "A sponsor funds the door's reserve.",
      split ? "Each round moves the whole reserve into tonight's pot, and the night's winners split it." : "Each round moves enough for its cracks into tonight's pot.",
      "A win holds its cut until the time lock opens, then the winner claims it.",
      // vault close_round: day_pot is added back to pot.
      "When the round closes, whatever was not won goes back to the reserve.",
      // vault GUEST_HOLD_NS and expire.
      "A win not claimed within 7 days goes back to the reserve too.",
    ],
  };
}
