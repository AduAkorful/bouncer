/** A game name for this browser. It is not a NEAR account and it is not stored on the chain. */

const ADJECTIVES = ["Quiet", "Brass", "Late", "Neon", "Swift", "Bold", "Calm", "Warm", "Dusty", "Lucky"] as const;
const NOUNS = ["Okada", "Taxi", "Lamp", "Queue", "Drum", "Night", "Door", "Stamp", "Suya", "Radio"] as const;

const NAME = /^[A-Za-z][A-Za-z0-9]{2,23}$/;

/** Two words and a number, in the shape of a generated handle. */
export function generatedPlayerName(random: () => number = Math.random): string {
  return `${pick(ADJECTIVES, random)}${pick(NOUNS, random)}${2 + Math.floor(random() * 98)}`;
}

/** A name the player typed. Empty, short, or punctuated text is refused. */
export function playerNameToStore(input: string): string | null {
  const trimmed = input.trim();
  return NAME.test(trimmed) ? trimmed : null;
}

function pick<T>(list: readonly T[], random: () => number): T {
  const index = Math.min(list.length - 1, Math.max(0, Math.floor(random() * list.length)));
  return list[index] as T;
}
