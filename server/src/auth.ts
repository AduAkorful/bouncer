/**
 * Sponsor routes are signed. The page signs `bouncer.sponsor.v1|route|unix seconds|nonce` with the sponsor
 * account's key, and the server checks that the key is a full-access key on that account. The header is
 * `account|publicKey|seconds|nonce|signature` with the signature in base64.
 */

import { PublicKey } from "near-api-js";
import { challengeMessage } from "../../web/lib/sponsor-auth.ts";

const WINDOW_SECONDS = 120;

export type SponsorAuth = {
  /** Is this public key a full-access key on this account? null when the chain could not say. */
  accessKeyIsFull: (account: string, publicKey: string) => Promise<boolean | null>;
  now: () => number;
};

export function createAuthenticator(deps: SponsorAuth) {
  const seen = new Map<string, number>();
  return async function authenticate(header: string | undefined, route: string): Promise<{ ok: true; account: string } | { ok: false }> {
    if (!header || header.length > 600) return { ok: false };
    const parts = header.split("|");
    if (parts.length !== 5) return { ok: false };
    const [account, publicKey, secondsText, nonce, signature] = parts;
    const seconds = Number(secondsText);
    const now = Math.floor(deps.now() / 1000);
    if (!/^[0-9a-f]{8,32}$/.test(nonce) || !/^[a-z0-9._-]{2,64}$/.test(account) || !Number.isSafeInteger(seconds) || Math.abs(now - seconds) > WINDOW_SECONDS) return { ok: false };
    for (const [sig, until] of seen) if (until < now) seen.delete(sig);
    if (seen.has(signature)) return { ok: false };
    let valid = false;
    try {
      valid = PublicKey.fromString(publicKey).verify(challengeMessage(route, seconds, nonce), Buffer.from(signature, "base64"));
    } catch {
      return { ok: false };
    }
    if (!valid) return { ok: false };
    if ((await deps.accessKeyIsFull(account, publicKey)) !== true) return { ok: false };
    seen.set(signature, now + WINDOW_SECONDS * 2);
    return { ok: true, account };
  };
}
