import { generateSponsorDraft } from "./sponsor-draft.ts";
import { Account, actions, type KeyPairString } from "near-api-js";
import { httpRpc, type Rpc } from "../../web/lib/chain.ts";
import { parseOwner, parseVault, viewRequest } from "../../web/lib/vault.ts";
import { parseLimits, parseVaultList } from "../../web/lib/sponsor-views.ts";
import { createPasskeyAccount } from "../../web/lib/passkey-sponsor.ts";
import { submitVerdict } from "../../web/lib/submit-verdict.ts";
import type { Call } from "../../web/lib/vault-calls.ts";
import type { Deps } from "./app.ts";
import { createClaimRelay } from "./claim-relay.ts";
import { requestCommit } from "./commit-flow.ts";
import type { ServerEnv } from "./env.ts";
import { createGuardPost, type Post } from "./guard-client.ts";
import type { KeeperChain } from "./keeper.ts";
import { createBudget, createCounter, createLimiter } from "./limits.ts";
import { readSurrealEnv, surrealPlayers } from "./player-db.ts";

export async function chainNowMs(rpcUrl: string): Promise<{ ok: true; nowMs: number } | { ok: false; error: string }> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "status", method: "status", params: [] }),
    });
    if (!response.ok) return { ok: false, error: "rpc" };
    const body = (await response.json()) as { result?: { sync_info?: { latest_block_time?: unknown } } };
    const time = body.result?.sync_info?.latest_block_time;
    const nowMs = typeof time === "string" ? Date.parse(time) : NaN;
    return Number.isFinite(nowMs) ? { ok: true, nowMs } : { ok: false, error: "rpc" };
  } catch {
    return { ok: false, error: "rpc" };
  }
}

export function liveDeps(env: ServerEnv, status: () => unknown, verdictKeyReady: () => boolean): Deps {
  const now = () => Date.now();
  const modelKey = process.env.NEAR_AI_KEY?.trim();
  const surreal = readSurrealEnv(process.env);
  return {
    env,
    rpc: httpRpc(env.relay.rpcUrl),
    post: createGuardPost(),
    generateDraft: modelKey ? (story, decimals, cap) => generateSponsorDraft(modelKey, story, decimals, cap) : undefined,
    now,
    limiter: createLimiter(now),
    budget: createBudget(now, env.dailyCalls),
    bills: createCounter(),
    accessKeyIsFull: (account, publicKey) => accessKeyIsFull(env.relay.rpcUrl, account, publicKey),
    marks: new Map(),
    players: surreal.ok && surreal.env ? surrealPlayers(surreal.env) : undefined,
    verdictKeyReady,
    submitVerdict: (verdict, signature) => submitVerdict(env.relay, verdict, signature),
    createAccount: (publicKey) => createPasskeyAccount(env.relay, publicKey),
    relayClaim: createClaimRelay(env.relay),
    chainNowMs: () => chainNowMs(env.relay.rpcUrl),
    status,
  };
}

export function liveKeeperChain(env: ServerEnv, rpc: Rpc, post: Post): KeeperChain {
  const keeper = env.keeper;
  if (!keeper) throw new Error("no keeper");
  const contractId = env.relay.contractId;
  const account = new Account(keeper.accountId, env.relay.rpcUrl, keeper.privateKey as KeyPairString);
  return {
    contractId,
    async listVaults(from, limit) {
      const r = await rpc(viewRequest(contractId, "list_vaults", { from_index: from, limit }));
      const list = r.ok ? parseVaultList(r.value) : null;
      return list && list.ok ? list.value : null;
    },
    async readVault(id) {
      const r = await rpc(viewRequest(contractId, "get_vault", { vault_id: id }));
      const v = r.ok ? parseVault(r.value) : null;
      return v && v.ok ? v.vault : null;
    },
    async limits() {
      const r = await rpc(viewRequest(contractId, "get_limits", {}));
      const l = r.ok ? parseLimits(r.value) : null;
      return l && l.ok ? l.value : null;
    },
    async owner() {
      const r = await rpc(viewRequest(contractId, "get_owner", {}));
      const o = r.ok ? parseOwner(r.value) : null;
      return o && o.ok ? o.owner : null;
    },
    async nowNs() {
      const t = await chainNowMs(env.relay.rpcUrl);
      return t.ok ? BigInt(Math.trunc(t.nowMs)) * 1_000_000n : null;
    },
    async commit(vaultId) {
      const r = await requestCommit({ rpc, post, guard: env.guard, contractId, vaultId });
      return r.ok ? r : { ok: false, error: r.error };
    },
    async send(call) {
      try {
        const outcome = await account.signAndSendTransaction({
          receiverId: call.receiverId,
          waitUntil: "FINAL",
          actions: [actions.functionCall(call.method, call.args, call.gas, call.depositYocto)],
        });
        const hash = outcome.transaction?.hash;
        if (!hash) return { ok: false, error: "no hash" };
        const status = outcome.status;
        if (status && typeof status === "object" && "Failure" in status) return { ok: false, error: describeFailure(status) };
        return { ok: true, hash };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "send" };
      }
    },
  };
}

/** The contract's reason, when the runtime gives one. */
function describeFailure(status: unknown): string {
  const text = JSON.stringify(status);
  const match = /Smart contract panicked: ([^"\\]+)/.exec(text);
  return match ? match[1] : "the vault refused it";
}

/** Is this key a full-access key on the account? null when the chain could not say. */
export async function accessKeyIsFull(rpcUrl: string, account: string, publicKey: string): Promise<boolean | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "key", method: "query", params: { request_type: "view_access_key", finality: "final", account_id: account, public_key: publicKey } }),
    });
    const body = (await response.json()) as { result?: { permission?: unknown }; error?: unknown };
    if (body.result) return body.result.permission === "FullAccess";
    return body.error ? false : null;
  } catch {
    return null;
  }
}
