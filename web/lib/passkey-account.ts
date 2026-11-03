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

export function signPayloadBytes(value: unknown): number[] | null {
  if (Array.isArray(value) && value.length > 0 && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return value;
  }
  if (typeof value !== "string" || value.length === 0) return null;
  let padded = value.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4 !== 0) padded += "=";
  if (padded.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(padded)) return null;
  const bytes = Buffer.from(padded, "base64");
  if (bytes.length === 0) return null;
  return [...bytes];
}

type ReceiptStatus = { outcome?: { status?: unknown } };

export function signatureOutcome<T extends { status?: unknown; receipts_outcome?: ReceiptStatus[] }>(
  outcome: T,
): (T & { status: { SuccessValue: string } }) | null {
  const direct = successValue(outcome.status);
  if (direct) return { ...outcome, status: { SuccessValue: direct } };
  const receipts = outcome.receipts_outcome ?? [];
  for (let i = receipts.length - 1; i >= 0; i -= 1) {
    const value = successValue(receipts[i]?.outcome?.status);
    if (value) return { ...outcome, status: { SuccessValue: value } };
  }
  return null;
}

function successValue(status: unknown): string | null {
  if (!status || typeof status !== "object" || !("SuccessValue" in status)) return null;
  const value = (status as { SuccessValue?: unknown }).SuccessValue;
  if (typeof value !== "string" || value.length === 0 || value === "bnVsbA==") return null;
  return value;
}
