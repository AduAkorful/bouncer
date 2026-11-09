import { Account, type KeyPairString } from "near-api-js";
import type { RelayEnv } from "./config";
import type { VerdictBody } from "./verdict-turn";

/** The relay keeps the round as a string to compare it with the vault view. The contract reads a u64. */
export function verdictArgs(verdict: VerdictBody, signature: number[]): { verdict: Omit<VerdictBody, "round"> & { round: number }; signature: number[] } | null {
  const round = Number(verdict.round);
  if (!/^[0-9]+$/.test(verdict.round) || !Number.isSafeInteger(round)) return null;
  return { verdict: { ...verdict, round }, signature };
}

export async function submitVerdict(
  env: RelayEnv,
  verdict: VerdictBody,
  signature: number[],
): Promise<{ ok: true; transactionHash: string } | { ok: false; error: string }> {
  const args = verdictArgs(verdict, signature);
  if (!args) return { ok: false, error: "round" };
  let account: Account;
  try {
    account = new Account(env.accountId, env.rpcUrl, env.privateKey as KeyPairString);
  } catch {
    return { ok: false, error: "relay key" };
  }
  try {
    const outcome = await account.callFunctionRaw({
      contractId: env.contractId,
      methodName: "submit_verdict",
      args,
    });
    const hash = outcome.transaction.hash;
    if (!hash) return { ok: false, error: "rpc" };
    if (outcome.status && typeof outcome.status === "object" && "Failure" in outcome.status) {
      return { ok: false, error: "rejected" };
    }
    return { ok: true, transactionHash: hash };
  } catch {
    return { ok: false, error: "rpc" };
  }
}
