/** Which sponsor step comes next, from chain state alone. No server remembers a sponsor's progress. */

import type { VaultView } from "./vault.ts";

export type SponsorStep = "account" | "story" | "seal" | "fund" | "launch" | "open" | "between";

export function sponsorStep(input: { accountId: string | null; vault: VaultView | null }): SponsorStep {
  const { accountId, vault } = input;
  if (!accountId) return "account";
  if (!vault) return "story";
  if (vault.open) return "open";
  if (!vault.specHash) return "seal";
  if (BigInt(vault.pot) + BigInt(vault.dayPot) === 0n) return "fund";
  return vault.specLocked ? "between" : "launch";
}

/** A vault whose keeper is set and which has not opened by 00:30 UTC after its last round closed. */
export function notOpenTonight(vault: VaultView, nowMs: number, keeperAccount: string | null): boolean {
  if (!keeperAccount || vault.keeper !== keeperAccount || vault.open || vault.suspended) return false;
  const day = 86_400_000;
  const sinceMidnight = nowMs % day;
  return sinceMidnight > 30 * 60_000;
}
