/** What the board says about a player beyond the place: milestones earned, and how far the next place is. */

export type Standing = { name: string; place: number; nights: number; streak: number };

type Milestone = { label: string; earned: boolean };

/** Milestones come only from the nights and the streak the board already shows. A bill never enters. */
export function milestones(nights: number, streak: number): Milestone[] {
  return [
    { label: "First night in", earned: nights >= 1 },
    { label: "Regular · 3 nights in", earned: nights >= 3 },
    { label: "House favourite · 10 nights in", earned: nights >= 10 },
    { label: "3-day streak", earned: streak >= 3 },
    { label: "7-day streak", earned: streak >= 7 },
  ];
}

export function earned(nights: number, streak: number): string[] {
  return milestones(nights, streak).filter((m) => m.earned).map((m) => m.label);
}

/** The next milestone not yet earned, as a sentence, or null when there is none left. */
export function nextMilestone(nights: number, streak: number): string | null {
  const next = milestones(nights, streak).find((m) => !m.earned);
  if (!next) return null;
  return `Next: ${next.label}.`;
}

/** What it takes to pass the player one place above. Ties share a place, so the player above is the nearest with a higher one. */
export function gapToNext(rows: Standing[], name: string): string | null {
  const index = rows.findIndex((row) => row.name === name);
  if (index < 0) return null;
  const me = rows[index];
  if (me.place === 1) return "You are first. Keep the streak going to stay there.";
  const above = [...rows.slice(0, index)].reverse().find((row) => row.place < me.place);
  if (!above) return null;
  const nights = above.nights - me.nights;
  if (nights > 0) return `${nights} more ${nights === 1 ? "night" : "nights"} in passes ${above.name}.`;
  const days = above.streak - me.streak;
  return days > 0 ? `${days} more streak ${days === 1 ? "day" : "days"} passes ${above.name}.` : null;
}
