import { Account, actions, type KeyPairString } from "near-api-js";
import type { RelayEnv } from "./config";
import { accountIdForPublicKey, signatureOutcome, signPayloadBytes, sponsorNear } from "./passkey-account";

const CREATE_CAP = 8;
const SIGN_CAP = 8;
let creates = 0;
let signs = 0;

export async function createPasskeyAccount(
  env: RelayEnv,
  authContractId: string,
  publicKey: string,
): Promise<{ ok: true; accountId: string; transactionHash: string | null } | { ok: false; error: string }> {
  if (!authContractId) return { ok: false, error: "auth" };
  const accountId = await accountIdForPublicKey(publicKey, env.accountId);
  if (!accountId) return { ok: false, error: "account" };
  try {
    if (await accountExists(env.rpcUrl, accountId)) return { ok: true, accountId, transactionHash: null };
  } catch {
    return { ok: false, error: "account" };
  }
  if (creates >= CREATE_CAP) return { ok: false, error: "account" };
  creates += 1;
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

export async function signPasskeyTransaction(
  env: RelayEnv,
  authContractId: string,
  body: unknown,
): Promise<{ ok: true; hash: string; result: unknown } | { ok: false; error: string }> {
  if (!authContractId || !body || typeof body !== "object") return { ok: false, error: "sign" };
  const record = body as Record<string, unknown>;
  const guardId = record.guard_id;
  const verifyPayload = record.verify_payload;
  const algorithm = record.algorithm ?? "eddsa";
  const payload = signPayloadBytes(record.sign_payload);
  if (typeof guardId !== "string" || !guardId.startsWith("jwt#https://login.testnet.fast-auth.com/")) return { ok: false, error: "sign" };
  if (typeof verifyPayload !== "string" || verifyPayload.length === 0) return { ok: false, error: "sign" };
  if (algorithm !== "eddsa" || !payload) return { ok: false, error: "sign" };
  if (signs >= SIGN_CAP) return { ok: false, error: "sign" };
  signs += 1;
  try {
    const sponsor = new Account(env.accountId, env.rpcUrl, env.privateKey as KeyPairString);
    const outcome = await sponsor.signAndSendTransaction({
      receiverId: authContractId,
      waitUntil: "FINAL",
      actions: [
        actions.functionCall(
          "sign",
          { guard_id: guardId, verify_payload: verifyPayload, sign_payload: payload, algorithm },
          300_000_000_000_000n,
          1n,
        ),
      ],
    });
    const signed = signatureOutcome(outcome);
    const hash = outcome.transaction?.hash;
    if (!signed || !hash) return { ok: false, error: "sign" };
    return { ok: true, hash, result: signed };
  } catch {
    return { ok: false, error: "sign" };
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
