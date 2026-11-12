/**
 * What the score plays in each moment of a raid: a volume for each stem, and where the club wall's
 * low-pass sits (Hz). Outside, the music is heard through the wall; as the night builds, the wall thins;
 * when you get in, it is gone. Changes land on the next bar line.
 */

export type ScoreStem = "kick" | "perc" | "bass" | "chords" | "hook" | "arps" | "tick" | "pad";
export type ScoreState = "street" | "left6" | "left5" | "left4" | "left3" | "left2" | "left1" | "inside" | "out";

type Mix = { gains: Partial<Record<ScoreStem, number>>; wall: number };

export const SCORE_MIX = {
  street: { gains: { kick: 1, perc: 0.35, bass: 1, chords: 0.4, pad: 0.8, hook: 0, arps: 0, tick: 0 }, wall: 420 },
  left6: { gains: { kick: 1, perc: 1, bass: 1, chords: 0.5, pad: 0.45 }, wall: 2400 },
  left5: { gains: { kick: 1, perc: 1, bass: 1, chords: 0.7, pad: 0.35 }, wall: 3000 },
  left4: { gains: { kick: 1, perc: 1, bass: 1, chords: 1, pad: 0.25 }, wall: 4200 },
  left3: { gains: { kick: 1, perc: 1, bass: 1, chords: 1, arps: 0.85, pad: 0.2 }, wall: 7000 },
  left2: { gains: { kick: 1, perc: 0.6, bass: 1, chords: 0.55, tick: 0.8, pad: 0.3 }, wall: 3200 },
  left1: { gains: { bass: 0.3, tick: 1, pad: 0.75 }, wall: 1600 },
  inside: { gains: { kick: 1, perc: 1, bass: 1, chords: 1, hook: 1, arps: 0.55 }, wall: 20000 },
  out: { gains: { kick: 0.55, bass: 0.4 }, wall: 260 },
  /** The music under a refusal, for one bar. */
  refuseDuck: 0.3,
  /** Stingers against the music. */
  stingerGain: 0.7,
  /** The whole score against the foley and voices. */
  musicGain: 0.8,
} satisfies Record<ScoreState, Mix> & { refuseDuck: number; stingerGain: number; musicGain: number };

/** The state for a number of messages left in a raid of `budget` messages. */
export function stateForLeft(left: number, budget = 6): ScoreState {
  if (left <= 0) return "left1";
  if (left === 1) return "left1";
  if (left === 2) return "left2";
  // A raid with a bigger or smaller budget builds over the same steps.
  const used = budget - left;
  if (used <= 0) return "left6";
  if (left === 3) return "left3";
  if (left === 4) return "left4";
  return "left5";
}
