const SPONSOR_NEAR = 200_000_000_000_000_000_000_000n;

export function sponsorNear(): bigint {
  return SPONSOR_NEAR;
}

export async function accountIdForPublicKey(publicKey: string, sponsor: string): Promise<string | null> {
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(publicKey)) return null;
  if (!/^[a-z0-9_-]{2,64}(?:\.[a-z0-9_-]{1,64})+$/.test(sponsor) || sponsor.length > 48) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(publicKey));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
  const accountId = `p${hex}.${sponsor}`;
  if (accountId.length > 64) return null;
  return accountId;
}
