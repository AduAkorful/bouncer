import { Account, type KeyPairString } from "near-api-js";
import type { RelayEnv } from "./config";
import type { VerdictBody } from "./verdict-turn";

type WireVerdict = Omit<VerdictBody, "round" | "amount"> & { round: number; amount: number };

/**
 * The relay keeps round and amount as strings to compare them with the vault view. The contract reads them as
 * JSON numbers (u64 and u128), so both are sent as numbers. One past the safe integer range is not sent.
 */
export function verdictArgs(verdict: VerdictBody, signature: number[]): { verdict: WireVerdict; signature: number[] } | null {
  const round = safeNumber(verdict.round);
  const amount = safeNumber(verdict.amount);
  if (round === null || amount === null) return null;
  return { verdict: { ...verdict, round, amount }, signature };
}

function safeNumber(text: string): number | null {
  if (!/^[0-9]+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

/** A contract panic is the same on every send, so it is reported apart from a network failure. */
function panicOf(error: unknown): string | null {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : JSON.stringify(error ?? "");
  const match = /Smart contract panicked: [^"\\]+/.exec(text);
  return match ? match[0].slice(0, 200) : null;
}

export async function submitVerdict(
  env: RelayEnv,
  verdict: VerdictBody,
  signature: number[],
): Promise<{ ok: true; transactionHash: string } | { ok: false; error: string; reason?: string }> {
  const args = verdictArgs(verdict, signature);
  if (!args) return { ok: false, error: "number" };
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
      return { ok: false, error: "refused", reason: panicOf(outcome.status.Failure) ?? "" };
    }
    return { ok: true, transactionHash: hash };
  } catch (error) {
    const reason = panicOf(error);
    return reason ? { ok: false, error: "refused", reason } : { ok: false, error: "rpc" };
  }
}
