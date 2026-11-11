import { KeyPair } from "near-api-js";
import type { Rpc } from "../../web/lib/chain.ts";
import { challengeMessage } from "../../web/lib/sponsor-auth.ts";
import type { VaultView } from "../../web/lib/vault.ts";
import type { LimitsView } from "../../web/lib/sponsor-views.ts";
import type { Deps } from "../src/app.ts";
import type { ServerEnv } from "../src/env.ts";
import { createBudget, createCounter, createLimiter } from "../src/limits.ts";

export const SECRETS = ["payment-key-secret", "relay-private-key-secret", "keeper-private-key-secret", "verdict-key-secret"];

export function testEnv(over: Partial<ServerEnv> = {}): ServerEnv {
  return {
    guard: { callUrl: "https://outlayer.test/call/a/b", paymentKey: SECRETS[0], versionKey: "ab".repeat(32), maxExecutionSeconds: 120, maxMemoryMb: 128 },
    relay: { rpcUrl: "https://rpc.test", networkId: "testnet", contractId: "vault.test", accountId: "relay.test", privateKey: SECRETS[1], verdictKey: SECRETS[3] },
    keeper: { accountId: "keeper.test", privateKey: SECRETS[2] },
    siteOrigins: ["https://site.test"],
    dailyCalls: 3,
    roundBills: 5,
    keyAllowanceYocto: 10n ** 24n,
    port: 8787,
    ...over,
  };
}

export const hex32 = (n: number) => Array.from({ length: 32 }, () => n);

/** A vault as the contract's JSON view returns it. */
export function vaultRow(over: Record<string, unknown> = {}) {
  return {
    sponsor: "sponsor.test", pot: "10000000", day_pot: "0", reserved: "0", cap: "1000000", lock_ns: "60000000000", rule: "PayTheBill",
    guard_pk: hex32(7), commitment: null, guard_version: null, round: "1", opens_at: "0", closes_at: "0", open: false, challenge_end: null,
    max_cracks: 2, ticketed: false, closed_pending_bump: false, refund_in_flight: "0", crack_count: 0, keeper: "keeper.test",
    spec_hash: hex32(5), card: "{}", spec_locked: false, suspended: false, ...over,
  };
}

export const limitsRow = {
  self_serve: true, max_cap: "5000000", max_cracks: 4, min_lock_ns: "60000000000", max_lock_ns: "86400000000000",
  max_open_lead_ns: "86400000000000", max_spec_ct: 8300, max_card: 600, default_guard_pk: hex32(7), reserved_prefixes: ["velvet"],
};

export const limitsView: LimitsView = {
  selfServe: true, maxCap: "5000000", maxCracks: 4, minLockNs: "60000000000", maxLockNs: "86400000000000",
  maxOpenLeadNs: "86400000000000", maxSpecCt: 8300, maxCard: 600, defaultGuardPk: "07".repeat(32), reservedPrefixes: ["velvet"],
};

/** A round open on the test clock (5 Nov 2026 12:00 UTC), closing at the next midnight. */
export function openRow(over: Record<string, unknown> = {}) {
  return vaultRow({ open: true, opens_at: "0", closes_at: String(BigInt(Date.UTC(2026, 10, 6)) * 1_000_000n), ...over });
}

export type Views = { vaults: Record<string, unknown>; specs: Record<string, string | null>; owner: string; calls: { method: string; args: Record<string, unknown> }[] };

/** An RPC that answers the vault's views from a table and records what was asked. */
export function fakeRpc(views: Views): Rpc {
  return async (request) => {
    const params = request.params as { method_name: string; args_base64: string };
    const args = JSON.parse(Buffer.from(params.args_base64, "base64").toString("utf8")) as Record<string, unknown>;
    views.calls.push({ method: params.method_name, args });
    let value: unknown;
    if (params.method_name === "get_vault") value = views.vaults[String(args.vault_id)] ?? null;
    else if (params.method_name === "get_owner") value = views.owner;
    else if (params.method_name === "get_spec") value = views.specs[String(args.vault_id)] ?? null;
    else if (params.method_name === "get_limits") value = limitsRow;
    else if (params.method_name === "get_crack") value = null;
    else return { ok: false, error: "rpc" };
    return { ok: true, value };
  };
}

export function testDeps(over: Partial<Deps> = {}, views?: Views): { deps: Deps; views: Views; posts: { op: unknown; input: Record<string, unknown> }[] } {
  const v = views ?? { vaults: { "velvet-1": openRow(), anchor: vaultRow() }, specs: { anchor: "AQID" }, owner: "owner.test", calls: [] };
  const posts: { op: unknown; input: Record<string, unknown> }[] = [];
  let t = Date.UTC(2026, 10, 5, 12, 0, 0);
  const now = () => t;
  const deps: Deps = {
    env: testEnv(),
    rpc: fakeRpc(v),
    post: async (call) => {
      posts.push({ op: call.body.input.op, input: call.body.input });
      return { ok: true, body: { ok: true, blob: "b", commitment: "11".repeat(32), guard_version: "22".repeat(32), signature: "33".repeat(64) } };
    },
    now,
    limiter: createLimiter(now),
    budget: createBudget(now, 3),
    bills: createCounter(),
    accessKeyIsFull: async () => true,
    marks: new Map(),
    verdictKeyReady: () => true,
    submitVerdict: async () => ({ ok: true, transactionHash: "hash" }),
    createAccount: async () => ({ ok: true, accountId: "a.relay.test" }),
    relayClaim: async () => ({ ok: true, hash: "claimhash" }),
    chainNowMs: async () => ({ ok: true, nowMs: t }),
    status: () => ({}),
    ...over,
  };
  return { deps, views: v, posts };
}

export const sponsorKey = KeyPair.fromRandom("ed25519");
let nonceCounter = 0;

/** A signed sponsor header for a route, as the page would send it. */
export function authHeader(route: string, over: { account?: string; seconds?: number; key?: KeyPair; nonce?: string; signRoute?: string } = {}): string {
  const key = over.key ?? sponsorKey;
  const seconds = over.seconds ?? Math.floor(Date.UTC(2026, 10, 5, 12, 0, 0) / 1000);
  const nonce = over.nonce ?? (++nonceCounter).toString(16).padStart(16, "0");
  const signature = Buffer.from(key.sign(challengeMessage(over.signRoute ?? route, seconds, nonce)).signature).toString("base64");
  return `${over.account ?? "sponsor.test"}|${key.getPublicKey().toString()}|${seconds}|${nonce}|${signature}`;
}

/** A passkey's player header for a route: the account key and the claim key both sign. Returns the claim key too. */
export function playerOpen(route: string, over: { account?: KeyPair; claim?: KeyPair } = {}): { header: string; claimKey: string; accountKey: string } {
  const account = over.account ?? KeyPair.fromRandom("ed25519");
  const claim = over.claim ?? KeyPair.fromRandom("ed25519");
  const claimHex = Buffer.from(claim.getPublicKey().data).toString("hex");
  const seconds = Math.floor(Date.UTC(2026, 10, 5, 12, 0, 0) / 1000);
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(8))).toString("hex");
  const message = new TextEncoder().encode(`bouncer.player.v1|${route}|${seconds}|${nonce}`);
  const sign = (key: KeyPair) => Buffer.from(key.sign(message).signature).toString("base64");
  const accountKey = account.getPublicKey().toString();
  return { header: [accountKey, claimHex, String(seconds), nonce, sign(account), sign(claim)].join("|"), claimKey: claimHex, accountKey };
}
