/** The vault's own panic reasons, as sentences. An unknown reason never reaches the screen as raw text. */

const REASONS: Record<string, string> = {
  closed: "Sponsors cannot create vaults yet.",
  "no guard": "The guard's key is not set on the vault contract yet.",
  "bad id": "That vault id cannot be used.",
  "reserved id": "That id is reserved. Pick another.",
  "vault exists": "A vault with that id exists. Pick another.",
  cap: "The cap is outside what sponsors may set.",
  lock: "The claim lock is outside what sponsors may set.",
  "max cracks": "The number of cracks is outside what sponsors may set.",
  "day budget": "The cap and the number of cracks are too large together.",
  "attach near": "Not enough NEAR was attached for the storage this call needs.",
  "not sponsor": "Only the vault's sponsor, owner, or keeper can do that.",
  "not owner": "Only the vault's owner or sponsor can do that.",
  "door open": "The door is open. Wait for the round to end.",
  "spec locked": "The story is fixed after the first round.",
  "spec size": "The sealed story is too large.",
  "card size": "The card is too large.",
  "card text": "The card has a character that is not allowed.",
  "no spec": "The vault has no story yet.",
  suspended: "This vault is suspended.",
  "opens at": "The opening time is too far ahead.",
  "guard version": "The guard's version does not match this vault's story.",
  "bad signature": "The guard's signature did not check out.",
  "empty pot": "The pot is empty. Fund the vault first.",
  "closes at": "That opening time has already closed.",
  "too early": "It is too early to do that.",
  "not open": "The round is not open.",
  challenge: "This vault has a challenge end. It is paid back when the challenge ends.",
  "reserved remains": "Some of the pot is reserved for a crack that has not been claimed.",
  "refund pending": "A refund is already on its way.",
  empty: "There is nothing to take back.",
  gas: "The transaction did not carry enough gas.",
  "sponsor cannot claim": "A door's sponsor or the vault owner cannot be paid from it.",
};

const GENERIC = "The vault refused this. Nothing was changed.";

export function reasonOf(failure: unknown): string {
  const text = typeof failure === "string" ? failure : JSON.stringify(failure ?? "");
  const match = /Smart contract panicked: ([^"\\]+)/.exec(text);
  if (!match) return GENERIC;
  return REASONS[match[1].trim()] ?? GENERIC;
}
