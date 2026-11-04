/**
 * What the contract will check, checked first. Each branch mirrors one `require!` in
 * `contracts/vault/src` and says the contract's reason as a sentence. The contract still decides.
 */

import type { LimitsView } from "./sponsor-views.ts";
import type { VaultView } from "./vault.ts";

export type Check = { ok: true } | { ok: false; error: string };

const OK: Check = { ok: true };
const NS_PER_DAY = 86_400_000_000_000n;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
/** NEAR kept back for the transaction's own gas. */
export const GAS_RESERVE_YOCTO = 100_000_000_000_000_000_000_000n;

export type Funds = { nearYocto: bigint; tokenUnits: bigint };

const no = (error: string): Check => ({ ok: false, error });

export function validVaultId(id: string): boolean {
  return id.length >= 1 && id.length <= 64 && /^[A-Za-z0-9._-]+$/.test(id);
}

/** Mirrors `create_sponsor_vault`. */
export function preflightCreate(input: {
  limits: LimitsView;
  vaultId: string;
  cap: bigint;
  lockNs: bigint;
  maxCracks: number;
  exists: boolean;
  depositYocto: bigint;
  funds: Funds;
}): Check {
  const { limits } = input;
  if (!limits.selfServe) return no("Sponsors cannot create vaults yet. The door is not open to them.");
  if (!limits.defaultGuardPk) return no("The guard's key is not set on the vault contract yet.");
  if (!validVaultId(input.vaultId)) return no("The vault id is 1 to 64 letters, digits, dots, dashes, and underscores.");
  if (limits.reservedPrefixes.some((prefix) => input.vaultId.startsWith(prefix))) return no("That id is reserved. Pick another.");
  if (input.exists) return no("A vault with that id exists. Pick another.");
  if (input.cap <= 0n || input.cap > BigInt(limits.maxCap)) return no("The cap per crack is above the limit for sponsors.");
  if (input.cap > MAX_SAFE) return no("The cap is too large to send.");
  if (input.lockNs < BigInt(limits.minLockNs) || input.lockNs > BigInt(limits.maxLockNs)) return no("The claim lock is outside the allowed range.");
  if (input.maxCracks < 1 || input.maxCracks > limits.maxCracks) return no("The number of cracks is above the limit for sponsors.");
  return near(input.funds, input.depositYocto);
}

/** Mirrors `set_spec`. */
export function preflightSetSpec(input: {
  limits: LimitsView;
  vault: VaultView;
  accountId: string;
  ctBytes: number;
  card: string;
  depositYocto: bigint;
  funds: Funds;
}): Check {
  const { vault, limits } = input;
  if (input.accountId !== vault.sponsor) return no("Only the vault's sponsor can set its story.");
  if (vault.open) return no("The door is open. A story cannot change during a round.");
  if (vault.specLocked) return no("The story is fixed after the first round. Make a new vault for a new story.");
  if (input.ctBytes < 1 || input.ctBytes > limits.maxSpecCt) return no("The sealed story is too large.");
  if (input.card.trim().length === 0 || new TextEncoder().encode(input.card).length > limits.maxCard) return no("The card is too large.");
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(input.card)) return no("The card has a control character.");
  return near(input.funds, input.depositYocto);
}

/** Mirrors `ft_on_transfer`, which refunds a deposit from anyone but the sponsor. */
export function preflightFund(input: { vault: VaultView; accountId: string; amount: bigint; funds: Funds; vaultRegistered: boolean }): Check {
  if (input.accountId !== input.vault.sponsor) return no("Only the vault's sponsor can fund it.");
  if (input.amount <= 0n) return no("Enter an amount above zero.");
  if (!input.vaultRegistered) return no("The vault account is not registered with the token, so it cannot receive funds yet.");
  if (input.funds.tokenUnits < input.amount) return no("The account does not hold that much of the token.");
  if (input.funds.nearYocto < GAS_RESERVE_YOCTO) return no("The account needs a little NEAR for the transaction.");
  return OK;
}

/** Mirrors `set_keeper`. */
export function preflightKeeper(input: { vault: VaultView; accountId: string }): Check {
  return input.accountId === input.vault.sponsor ? OK : no("Only the vault's sponsor can name a keeper.");
}

/** Mirrors `commit_round`, for whoever is about to send it. */
export function preflightCommit(input: {
  limits: LimitsView;
  vault: VaultView;
  owner: string;
  accountId: string;
  nowNs: bigint;
  opensAtNs: bigint;
  hasSignature: boolean;
}): Check {
  const { vault, limits } = input;
  const isOwner = input.accountId === input.owner;
  if (!(isOwner || input.accountId === vault.sponsor || input.accountId === vault.keeper)) return no("This account cannot open a round on this vault.");
  if (vault.open) return no("The door is already open.");
  if (vault.suspended) return no("This vault is suspended. A new round cannot open.");
  if (!vault.guardPk) return no("The vault has no guard key.");
  if (!isOwner) {
    if (!vault.specHash) return no("The vault has no story yet.");
    if (input.opensAtNs > input.nowNs + BigInt(limits.maxOpenLeadNs)) return no("The round is set to open too far ahead.");
  }
  if (!input.hasSignature) return no("The guard has not signed this round.");
  const budget = vault.rule === "PayTheBill" ? BigInt(vault.maxCracks) * BigInt(vault.cap) : BigInt(vault.pot);
  if (budget <= 0n) return no("The round has no budget.");
  if (BigInt(vault.pot) <= 0n) return no("The pot is empty. Fund the vault first.");
  const closesAt = (input.opensAtNs / NS_PER_DAY) * NS_PER_DAY + NS_PER_DAY;
  if (closesAt <= input.nowNs) return no("That opening time has already closed.");
  return OK;
}

/** Mirrors `reclaim`. */
export function preflightReclaim(input: { vault: VaultView; accountId: string }): Check {
  const { vault } = input;
  if (input.accountId !== vault.sponsor) return no("Only the vault's sponsor can take the pot back.");
  if (vault.open) return no("The door is open. Wait for the round to end.");
  if (vault.challengeEnd !== null) return no("This vault has a challenge end. It is paid back when the challenge ends.");
  if (BigInt(vault.reserved) !== 0n) return no("Some of the pot is reserved for a crack that has not been claimed.");
  if (BigInt(vault.refundInFlight) !== 0n) return no("A refund is already on its way.");
  if (BigInt(vault.pot) + BigInt(vault.dayPot) <= 0n) return no("There is nothing to take back.");
  return OK;
}

function near(funds: Funds, depositYocto: bigint): Check {
  if (funds.nearYocto < depositYocto + GAS_RESERVE_YOCTO) return no("The account does not hold enough NEAR for the storage deposit and gas.");
  return OK;
}
