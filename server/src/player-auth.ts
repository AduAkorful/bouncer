/** A player proves the passkey by signing one challenge with the account key and the claim key. */

import { baseEncode, PublicKey } from "near-api-js";

const DOMAIN = "bouncer.player.v1";
const WINDOW_SECONDS = 120;
const ACCOUNT = /^ed25519:[1-9A-HJ-NP-Za-km-z]+$/;
const CLAIM = /^[0-9a-f]{64}$/;

export function playerChallenge(route: string, seconds: number, nonce: string): Uint8Array {
  return new TextEncoder().encode(`${DOMAIN}|${route}|${seconds}|${nonce}`);
}

export function createPlayerAuth(now: () => number) {
  const seen = new Map<string, number>();
  return function authenticate(header: string | undefined, route: string): { ok: true; publicKey: string; claimKey: string } | { ok: false } {
    if (!header || header.length > 1200) return { ok: false };
    const parts = header.split("|");
    if (parts.length !== 6) return { ok: false };
    const [publicKey, claimKey, secondsText, nonce, accountSig, claimSig] = parts;
    const seconds = Number(secondsText);
    const current = Math.floor(now() / 1000);
    if (!ACCOUNT.test(publicKey) || !CLAIM.test(claimKey) || !/^[0-9a-f]{16}$/.test(nonce) || !Number.isSafeInteger(seconds) || Math.abs(current - seconds) > WINDOW_SECONDS) return { ok: false };
    for (const [sig, until] of seen) if (until < current) seen.delete(sig);
    if (seen.has(accountSig) || seen.has(claimSig)) return { ok: false };
    const message = playerChallenge(route, seconds, nonce);
    if (!verify(publicKey, message, accountSig) || !verify(claimPublicKey(claimKey), message, claimSig)) return { ok: false };
    seen.set(accountSig, current + WINDOW_SECONDS * 2);
    seen.set(claimSig, current + WINDOW_SECONDS * 2);
    return { ok: true, publicKey, claimKey };
  };
}

function verify(publicKey: string, message: Uint8Array, signature: string): boolean {
  try {
    return PublicKey.fromString(publicKey).verify(message, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

/** The claim key is stored as hex. Near's verifier wants the ed25519 form. */
export function claimPublicKey(hex: string): string {
  return `ed25519:${baseEncode(Buffer.from(hex, "hex"))}`;
}
