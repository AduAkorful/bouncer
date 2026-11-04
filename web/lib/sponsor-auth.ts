/** The signed challenge a sponsor page sends with each sponsor call. The server checks it against the chain. */

export const CHALLENGE_DOMAIN = "bouncer.sponsor.v1";

export function challengeMessage(route: string, seconds: number, nonce: string): Uint8Array {
  return new TextEncoder().encode(`${CHALLENGE_DOMAIN}|${route}|${seconds}|${nonce}`);
}

/** `account|publicKey|seconds|nonce|signature`, the signature in base64. */
export function buildAuthHeader(input: {
  account: string;
  publicKey: string;
  route: string;
  seconds: number;
  nonce: string;
  sign: (message: Uint8Array) => Uint8Array;
}): string {
  const signature = input.sign(challengeMessage(input.route, input.seconds, input.nonce));
  return `${input.account}|${input.publicKey}|${input.seconds}|${input.nonce}|${Buffer.from(signature).toString("base64")}`;
}
