import { viewRequest } from "./vault.ts";

export function balanceRequest(tokenId: string, accountId: string) {
  return viewRequest(tokenId, "ft_balance_of", { account_id: accountId });
}

export function metadataRequest(tokenId: string) {
  return viewRequest(tokenId, "ft_metadata", {});
}

/** Whole units with at most `decimals` places, as base units. Anything else is refused. */
export function toBaseUnits(text: string, decimals: number): bigint | null {
  const match = /^([0-9]+)(?:\.([0-9]+))?$/.exec(text.trim());
  if (!match || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;
  return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function fromBaseUnits(units: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals);
  const whole = units / unit;
  if (decimals === 0) return whole.toString();
  const fraction = (units % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function storageRequest(tokenId: string, accountId: string) {
  return viewRequest(tokenId, "storage_balance_of", { account_id: accountId });
}
