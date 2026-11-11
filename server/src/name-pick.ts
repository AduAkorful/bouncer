/** Generated player names: an adjective, an animal and a number, drawn with the system's cryptographic random source. */

import { randomInt } from "node:crypto";
import { adjectives, animals } from "unique-names-generator";

/** Draws a whole number from 0 up to, not including, `max`. */
export type Pick = (max: number) => number;

// Words that read as a remark about a person's body, health, identity or sex; a name is shown to other players.
const LEFT_OUT = new Set([
  "blind", "booby", "chubby", "christian", "crazy", "criminal", "dead", "deaf", "dirty", "drunk", "dying", "elderly",
  "fat", "filthy", "foolish", "gay", "grotesque", "homeless", "ill", "injured", "mad", "mute", "naked", "nasty",
  "poor", "psychiatric", "repulsive", "sexual", "sick", "skinny", "stupid", "ugly", "useless", "violent", "weak",
]);

// A typed name may be 24 characters; the fallback in freshName adds up to 3 digits to a generated one.
const MAX_LENGTH = 21;

export const ADJECTIVES = words(adjectives);
export const ANIMALS = words(animals);

export const NAME_SPACE = ADJECTIVES.length * ANIMALS.length * 98;

/** Two words and a number, such as BrightOtter42. A pair too long to fit is drawn again, so every name that fits is equally likely. */
export function generatedPlayerName(pick: Pick = randomInt): string {
  for (;;) {
    const name = `${ADJECTIVES[pick(ADJECTIVES.length)]}${ANIMALS[pick(ANIMALS.length)]}${2 + pick(98)}`;
    if (name.length <= MAX_LENGTH) return name;
  }
}

function words(list: readonly string[]): string[] {
  return list.filter((word) => !LEFT_OUT.has(word.toLowerCase())).map((word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase());
}
