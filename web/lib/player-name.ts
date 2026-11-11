/** A player name. Generated names come from the server. It is not a NEAR account and it is not stored on the chain. */

const NAME = /^[A-Za-z][A-Za-z0-9]{2,23}$/;

/** A name the player typed. Empty, short, or punctuated text is refused. */
export function playerNameToStore(input: string): string | null {
  const trimmed = input.trim();
  return NAME.test(trimmed) ? trimmed : null;
}
