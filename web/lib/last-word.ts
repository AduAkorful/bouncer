/**
 * The bouncer's last word when a raid runs out of messages. It never says what was wrong with a bill
 * (the flat refusal holds), and it never says another door is easier: every door passes the same
 * fairness test. It names a real open door with some rivalry instead, so the player has somewhere to go.
 */

export type Rival = { sign: string; guard: string | null; pot: string | null };

const WITH_RIVAL: ((r: { who: string; door: string; pot: string | null }) => string)[] = [
  ({ who, door }) => `Go and bother ${who} at ${door}. They think their door is tougher than mine. Prove them wrong.`,
  ({ who, door, pot }) => `Not here, not tonight. ${who} is still letting people try at ${door}${pot ? `. ${pot} on the board` : ""}.`,
  ({ who, door }) => `You talk a lot for my door. ${who} at ${door} has a whole queue of talkers. Go and join it.`,
  ({ who, door }) => `Six tries. I've seen worse. Tell ${who} at ${door} I sent you. They'll love that.`,
  ({ who, door, pot }) => `My list is closed to you. ${door} is still open${pot ? `, ${pot} in the pot` : ""}. Ask for ${who}.`,
];

const NO_RIVAL = [
  "Not tonight. Come back tomorrow with better paperwork. I'll still be here.",
  "Six tries, and I'm still standing here. Try me again tomorrow.",
  "That's your lot. The ledger opens at close. See what you missed.",
];

/** A stable pick, so a reload shows the same line. */
function pick<T>(list: T[], seed: string): T {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

export function lastWord(rival: Rival | null, seed: string): string {
  if (!rival) return pick(NO_RIVAL, seed);
  const who = rival.guard?.trim() || `the guard`;
  return pick(WITH_RIVAL, seed)({ who, door: rival.sign, pot: rival.pot });
}

const WIN = [
  "Fine. You're on the list. Don't make me regret it.",
  "…Alright. In you go. Act like you've been here before.",
  "Paperwork checks out. I hate it when that happens.",
  "Go on, then. Tell nobody how you did it.",
  "Approved. Enjoy it. Tomorrow you're a stranger again.",
];

/** The bouncer's grudging line when a bill gets in. Stable per raid. */
export function winWord(seed: string): string {
  return pick(WIN, seed);
}
