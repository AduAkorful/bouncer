"use client";

/** What the sponsor page does in the browser: read chain, sign as the sponsor, send. Nothing here keeps a key. */

import { Account, actions, KeyPair, type KeyPairString } from "near-api-js";
import { apiPost, apiPostOnce } from "./api.ts";
import { buildAuthHeader } from "./sponsor-auth.ts";
import { type Rpc } from "./chain.ts";
import { deriveSecrets } from "./device-pass.ts";
import { createHeld, unlockHeld } from "./player-hold.ts";
import { accessMessage, accessOnAccount, readPayoutAccount } from "./imported-account.ts";
import { parseBalance, parseLimits, parseTokenMeta, type LimitsView, type TokenMeta } from "./sponsor-views.ts";
import { byteCostFromConfig, protocolConfigRequest } from "./storage-cost.ts";
import { balanceRequest, metadataRequest, storageRequest } from "./token.ts";
import type { Call } from "./vault-calls.ts";
import { reasonOf } from "./vault-errors.ts";
import { parseOwner, parseVault, viewRequest, type VaultView } from "./vault.ts";

export type Sponsor = {
  accountId: string;
  /** Headers for a sponsor call to the server: the signed challenge for this route. */
  authHeaders: (route: string) => Record<string, string>;
  send: (call: Call) => Promise<{ ok: true; hash: string } | { ok: false; error: string }> };

/** The sponsor's account: the named testnet account this device holds a key for, or the passkey account the relay creates. */
/**
 * `create` makes a new passkey and its account. `makeAccount` makes the account for a passkey this browser is
 * already signed in with. A plain sign-in never makes an account: it says none exists and offers that step.
 */
export async function connectSponsor(input: { rpcUrl: string; networkId: string; storageName: string; create?: boolean; makeAccount?: boolean }): Promise<{ ok: true; sponsor: Sponsor } | { ok: false; error: string; noAccount?: boolean }> {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  const unlocked = input.create ? await createHeld() : await unlockHeld();
  if ("error" in unlocked) return { ok: false, error: unlocked.error };
  const secrets = await deriveSecrets(unlocked.ikm, "sponsor", "0");
  unlocked.ikm.fill(0);
  if ("error" in secrets) return { ok: false, error: "This device cannot keep a key in the passkey." };
  const named = readPayoutAccount(window.localStorage, input.storageName);
  let accountId = named;
  if (named) {
    const check = await accessOnAccount(input.rpcUrl, named, secrets.accountPublicKey);
    if (check !== "full") return { ok: false, error: accessMessage(check) };
  } else {
    const found = await existingPasskeyAccount(input.rpcUrl, secrets.accountPublicKey);
    // A lookup that could not finish is not "no account": offering to make one here would make a second.
    if (found === "unknown") return { ok: false, error: LOOKUP_FAILED };
    accountId = found === "none" ? null : found;
  }
  if (!accountId && !input.create && !input.makeAccount) {
    return { ok: false, error: "No testnet account uses this passkey yet.", noAccount: true };
  }
  if (!accountId) {
    const created = await apiPostOnce("/passkey/create-account", { publicKey: secrets.accountPublicKey });
    const body = (created.ok ? created.body : null) as { ok?: boolean; accountId?: string } | null;
    if (body?.ok && typeof body.accountId === "string") {
      accountId = body.accountId;
    } else {
      // The account may have been made even though the answer was lost. Look before saying it was not.
      const after = await existingPasskeyAccount(input.rpcUrl, secrets.accountPublicKey);
      if (after === "unknown" || after === "none") {
        const limited = created.ok && created.status === 429;
        return { ok: false, error: limited ? "Too many accounts were made from here today. Try again tomorrow." : CREATE_FAILED };
      }
      accountId = after;
    }
  }
  if (!accountId) return { ok: false, error: "The passkey account was not created." };
  const account = new Account(accountId, input.rpcUrl, secrets.accountSecret as KeyPairString);
  const keyPair = KeyPair.fromString(secrets.accountSecret as KeyPairString);
  return {
    ok: true,
    sponsor: {
      accountId,
      authHeaders(route) {
        const nonce = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
        return {
          "x-sponsor-auth": buildAuthHeader({
            account: accountId,
            publicKey: keyPair.getPublicKey().toString(),
            route,
            seconds: Math.floor(Date.now() / 1000),
            nonce,
            sign: (message) => keyPair.sign(message).signature,
          }),
        };
      },
      async send(call) {
        try {
          const outcome = await account.signAndSendTransaction({
            receiverId: call.receiverId,
            waitUntil: "FINAL",
            actions: [actions.functionCall(call.method, call.args, call.gas, call.depositYocto)],
          });
          const hash = outcome.transaction?.hash;
          if (!hash) return { ok: false, error: "The transaction was not sent." };
          if (outcome.status && typeof outcome.status === "object" && "Failure" in outcome.status) return { ok: false, error: reasonOf(outcome.status) };
          return { ok: true, hash };
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          return { ok: false, error: message.includes("Smart contract panicked") ? reasonOf(message) : "The transaction was not sent." };
        }
      },
    },
  };
}

export type Chain = {
  limits: LimitsView;
  owner: string;
  tokenId: string;
  token: TokenMeta;
  byteCost: bigint;
};

async function value(rpc: Rpc, contractId: string, method: string, args: Record<string, unknown>) {
  const result = await rpc(viewRequest(contractId, method, args));
  return result.ok ? result.value : undefined;
}

/** The facts every step needs. Any read that fails is an error, and nothing is filled in. */
export async function readChain(rpc: Rpc, rpcUrl: string, contractId: string): Promise<{ ok: true; chain: Chain } | { ok: false; error: string }> {
  const [limits, owner, tokenId] = await Promise.all([
    value(rpc, contractId, "get_limits", {}),
    value(rpc, contractId, "get_owner", {}),
    value(rpc, contractId, "get_usdc_account", {}),
  ]);
  const l = parseLimits(limits);
  const o = parseOwner(owner);
  if (!l.ok || !o.ok || typeof tokenId !== "string") return { ok: false, error: "The vault contract did not answer." };
  const meta = await rpc(metadataRequest(tokenId));
  const t = meta.ok ? parseTokenMeta(meta.value) : null;
  if (!t || !t.ok) return { ok: false, error: "The token did not answer." };
  let byteCost: bigint;
  try {
    const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(protocolConfigRequest()) });
    const cost = byteCostFromConfig(await response.json());
    if (!cost.ok) return { ok: false, error: "The network's storage price could not be read." };
    byteCost = cost.yoctoPerByte;
  } catch {
    return { ok: false, error: "The network's storage price could not be read." };
  }
  return { ok: true, chain: { limits: l.value, owner: o.owner, tokenId, token: t.value, byteCost } };
}

export async function readVault(rpc: Rpc, contractId: string, vaultId: string): Promise<{ ok: true; vault: VaultView | null } | { ok: false }> {
  const result = await rpc(viewRequest(contractId, "get_vault", { vault_id: vaultId }));
  if (!result.ok) return { ok: false };
  if (result.value === null) return { ok: true, vault: null };
  const parsed = parseVault(result.value);
  return parsed.ok ? { ok: true, vault: parsed.vault } : { ok: false };
}

export async function readFunds(rpc: Rpc, rpcUrl: string, tokenId: string, accountId: string): Promise<{ nearYocto: bigint; tokenUnits: bigint } | null> {
  const token = await rpc(balanceRequest(tokenId, accountId));
  const balance = token.ok ? parseBalance(token.value) : null;
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "acct", method: "query", params: { request_type: "view_account", finality: "final", account_id: accountId } }),
    });
    const body = (await response.json()) as { result?: { amount?: unknown } };
    const amount = body.result?.amount;
    if (!balance || !balance.ok || typeof amount !== "string" || !/^[0-9]+$/.test(amount)) return null;
    return { nearYocto: BigInt(amount), tokenUnits: BigInt(balance.value) };
  } catch {
    return null;
  }
}

/** Has the token registered the vault account? Without it the vault cannot receive a deposit. */
export async function vaultRegistered(rpc: Rpc, tokenId: string, vaultContractId: string): Promise<boolean> {
  const result = await rpc(storageRequest(tokenId, vaultContractId));
  return result.ok && result.value !== null;
}

/** The chain's own time, in nanoseconds. The browser's clock is not used for a round. */
export async function chainNowNs(rpcUrl: string): Promise<bigint | null> {
  try {
    const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: "t", method: "status", params: [] }) });
    const body = (await response.json()) as { result?: { sync_info?: { latest_block_time?: unknown } } };
    const time = body.result?.sync_info?.latest_block_time;
    const ms = typeof time === "string" ? Date.parse(time) : NaN;
    return Number.isFinite(ms) ? BigInt(Math.trunc(ms)) * 1_000_000n : null;
  } catch {
    return null;
  }
}

/**
 * A returning sponsor on a cleared browser already has an account. Looking it up first keeps the
 * relay's daily creation allowance for new accounts.
 */
async function existingPasskeyAccount(rpcUrl: string, publicKey: string): Promise<string | "none" | "unknown"> {
  const looked = await apiPost("/passkey/account", { publicKey });
  const body = (looked.ok ? looked.body : null) as { ok?: boolean; accountId?: string } | null;
  if (!looked.ok || looked.status !== 200 || !body?.ok || typeof body.accountId !== "string") return "unknown";
  const check = await accessOnAccount(rpcUrl, body.accountId, publicKey);
  if (check === "full") return body.accountId;
  // Only the chain saying the account does not exist means there is none.
  return check === "absent" ? "none" : "unknown";
}

const LOOKUP_FAILED = "Your account could not be checked right now. Try again in a minute.";
const CREATE_FAILED = "The passkey account was not made. Wait a minute and try again; the same passkey keeps the same account.";
