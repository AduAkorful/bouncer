import { Account, type KeyPairString } from "near-api-js";
import type { RelayEnv } from "./config";
import { accountIdForPublicKey, sponsorNear } from "./passkey-account";

// Rate limits live in the server that calls these, per address and per day. A counter here would only
// count for the life of one process and never reset.

export async function createPasskeyAccount(
  env: RelayEnv,
  publicKey: string,
): Promise<{ ok: true; accountId: string; transactionHash: string | null } | { ok: false; error: string }> {
  const accountId = await accountIdForPublicKey(publicKey, env.accountId);
  if (!accountId) return { ok: false, error: "account" };
  try {
    if (await accountExists(env.rpcUrl, accountId)) return { ok: true, accountId, transactionHash: null };
  } catch {
    return { ok: false, error: "account" };
  }
  try {
    const sponsor = new Account(env.accountId, env.rpcUrl, env.privateKey as KeyPairString);
    const outcome = await sponsor.createAccount({
      newAccountId: accountId,
      publicKey,
      nearToTransfer: sponsorNear(),
    });
    const hash = outcome.transaction?.hash;
    if (!hash) return { ok: false, error: "account" };
    if (failed(outcome.status)) return { ok: false, error: "account" };
    return { ok: true, accountId, transactionHash: hash };
  } catch {
    return { ok: false, error: "account" };
  }
}

async function accountExists(rpcUrl: string, accountId: string): Promise<boolean> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "account",
      method: "query",
      params: { request_type: "view_account", finality: "final", account_id: accountId },
    }),
  });
  const body = (await response.json().catch(() => null)) as { result?: unknown; error?: { cause?: { name?: string } } } | null;
  if (body?.result) return true;
  const described = JSON.stringify(body?.error ?? "");
  if (described.includes("UNKNOWN_ACCOUNT") || described.includes("does not exist")) return false;
  throw new Error("rpc");
}

function failed(status: unknown): boolean {
  return Boolean(status && typeof status === "object" && "Failure" in status);
}
