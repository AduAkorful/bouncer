import { apiPost } from "./api.ts";
import { readPayoutAccount } from "./imported-account.ts";

/**
 * True when this passkey's account, or the payout account named on this browser, is the door's sponsor.
 * The passkey account is the same one the sponsor page uses, so a sponsor playing their own door is caught here.
 * A lookup that fails is not proof either way; the vault still refuses to pay a sponsor.
 */
export async function sponsorsThisDoor(publicKey: string, storageName: string, sponsor: string): Promise<boolean> {
  const named = typeof window === "undefined" ? null : readPayoutAccount(window.localStorage, storageName);
  if (named && named === sponsor) return true;
  const looked = await apiPost("/passkey/account", { publicKey });
  const body = (looked.ok && looked.status === 200 ? looked.body : null) as { ok?: boolean; accountId?: string } | null;
  return Boolean(body?.ok && body.accountId === sponsor);
}
