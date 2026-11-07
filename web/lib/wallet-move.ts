/** Move the payout token, or show the key that spends the payout account. Testnet only. */

import { Account, actions, type KeyPairString } from "near-api-js";
import { apiPost } from "./api.ts";
import { httpRpc } from "./chain.ts";
import { deriveSecrets } from "./device-pass.ts";
import { unlockHeld } from "./player-hold.ts";
import { payoutExplorerUrl } from "./explorer.ts";
import { testnetAccountId } from "./imported-account.ts";
import { parseBalance, parseTokenMeta } from "./sponsor-views.ts";
import { balanceRequest, metadataRequest, toBaseUnits } from "./token.ts";
import { viewRequest } from "./vault.ts";

const GAS = 30_000_000_000_000n;
const ONE_YOCTO = 1n;

export type TransferPlan =
  | { ok: true; tokenId: string; receiverId: string; amount: bigint }
  | { ok: false; error: string };

export function planTransfer(input: {
  networkId: string;
  tokenId: string;
  to: string;
  amountText: string;
  decimals: number;
  balance: bigint;
}): TransferPlan {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  if (!input.tokenId) return { ok: false, error: "The token could not be read." };
  const receiverId = testnetAccountId(input.to);
  if (!receiverId) return { ok: false, error: "That account name cannot be used." };
  const amount = toBaseUnits(input.amountText, input.decimals);
  if (amount === null || amount <= 0n) return { ok: false, error: "That amount cannot be used." };
  if (amount > input.balance) return { ok: false, error: "The account does not hold that much." };
  return { ok: true, tokenId: input.tokenId, receiverId, amount };
}

export async function readPayoutToken(
  rpcUrl: string,
  contractId: string,
  accountId: string,
): Promise<{ ok: true; tokenId: string; symbol: string; decimals: number; balance: bigint; opened: boolean } | { ok: false; error: string }> {
  const rpc = httpRpc(rpcUrl, fetch);
  const account = await rpc(viewRequest(contractId, "get_usdc_account", {}));
  if (!account.ok || typeof account.value !== "string" || !account.value) return { ok: false, error: "The token could not be read." };
  const meta = await rpc(metadataRequest(account.value));
  const parsed = meta.ok ? parseTokenMeta(meta.value) : null;
  if (!parsed?.ok) return { ok: false, error: "The token could not be read." };
  const opened = await accountOnChain(rpcUrl, accountId);
  if (!opened) return { ok: true, tokenId: account.value, symbol: parsed.value.symbol, decimals: parsed.value.decimals, balance: 0n, opened: false };
  const balance = await rpc(balanceRequest(account.value, accountId));
  const units = balance.ok ? parseBalance(balance.value) : null;
  if (!units?.ok) return { ok: false, error: "The balance could not be read." };
  return { ok: true, tokenId: account.value, symbol: parsed.value.symbol, decimals: parsed.value.decimals, balance: BigInt(units.value), opened: true };
}

export async function lookupPasskeyAccount(publicKey: string): Promise<string | null> {
  const result = await apiPost("/passkey/account", { publicKey });
  const body = result.ok && result.body && typeof result.body === "object" ? result.body as { ok?: unknown; accountId?: unknown } : null;
  return body?.ok === true && typeof body.accountId === "string" ? body.accountId : null;
}

export async function revealAccountKey(input: {
  networkId: string;
  vaultId: string;
  round: string;
}): Promise<{ ok: true; secret: string } | { ok: false; error: string }> {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  const secrets = await signingSecrets(input.vaultId, input.round);
  if (!secrets.ok) return secrets;
  return { ok: true, secret: secrets.accountSecret };
}

export async function sendTransfer(input: {
  networkId: string;
  rpcUrl: string;
  vaultId: string;
  round: string;
  from: string;
  tokenId: string;
  to: string;
  amountText: string;
  decimals: number;
  balance: bigint;
}): Promise<{ ok: true; transactionHash: string } | { ok: false; error: string }> {
  const planned = planTransfer(input);
  if (!planned.ok) return planned;
  const from = testnetAccountId(input.from);
  if (!from) return { ok: false, error: "That account name cannot be used." };
  const secrets = await signingSecrets(input.vaultId, input.round);
  if (!secrets.ok) return secrets;
  try {
    const player = new Account(from, input.rpcUrl, secrets.accountSecret as KeyPairString);
    const outcome = await player.signAndSendTransaction({
      receiverId: planned.tokenId,
      waitUntil: "FINAL",
      actions: [
        actions.functionCall(
          "ft_transfer",
          { receiver_id: planned.receiverId, amount: planned.amount.toString(), memo: null },
          GAS,
          ONE_YOCTO,
        ),
      ],
    });
    const hash = outcome.transaction?.hash;
    if (!hash || !payoutExplorerUrl(hash)) return { ok: false, error: "The transfer was not sent." };
    if (outcome.status && typeof outcome.status === "object" && "Failure" in outcome.status) {
      return { ok: false, error: "The token refused the transfer." };
    }
    return { ok: true, transactionHash: hash };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("storage")) return { ok: false, error: "That account is not registered for this token." };
    return { ok: false, error: "The transfer was not sent." };
  }
}

async function accountOnChain(rpcUrl: string, accountId: string): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "account", method: "query", params: { request_type: "view_account", finality: "final", account_id: accountId } }),
    });
    if (!response.ok) return true;
    const body = await response.json() as { error?: { cause?: { name?: string } }; result?: unknown };
    return body.error?.cause?.name !== "UNKNOWN_ACCOUNT";
  } catch {
    return true;
  }
}

async function signingSecrets(vaultId: string, round: string): Promise<{ ok: true; accountSecret: string } | { ok: false; error: string }> {
  const unlocked = await unlockHeld();
  if ("error" in unlocked) return { ok: false, error: unlocked.error };
  const secrets = await deriveSecrets(unlocked.ikm, vaultId, round);
  unlocked.ikm.fill(0);
  if ("error" in secrets) return { ok: false, error: "This device cannot keep a key in the passkey." };
  return { ok: true, accountSecret: secrets.accountSecret };
}
