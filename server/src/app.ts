import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { readDoor, type Rpc } from "../../web/lib/chain.ts";
import { runGuardTurn } from "../../web/lib/guard-turn.ts";
import type { Mark } from "../../web/lib/marks.ts";
import { parseVerdictSubmission, submissionAllowed, type VerdictBody } from "../../web/lib/verdict-turn.ts";
import { parseCrack, viewRequest } from "../../web/lib/vault.ts";
import { validVaultId } from "../../web/lib/preflight.ts";
import { requestCommit } from "./commit-flow.ts";
import type { ServerEnv } from "./env.ts";
import { sponsorCall, type Post, type SponsorOp } from "./guard-client.ts";
import type { Budget, Counter, Limiter } from "./limits.ts";
import { createAuthenticator } from "./auth.ts";

export type Deps = {
  env: ServerEnv;
  rpc: Rpc;
  post: Post;
  now: () => number;
  limiter: Limiter;
  budget: Budget;
  bills: Counter;
  accessKeyIsFull: (account: string, publicKey: string) => Promise<boolean | null>;
  marks: Map<string, Mark>;
  submitVerdict: (verdict: VerdictBody, signature: number[]) => Promise<{ ok: true; transactionHash: string } | { ok: false; error: string }>;
  createAccount: (publicKey: string) => Promise<unknown & { ok: boolean }>;
  signTransaction: (body: unknown) => Promise<unknown & { ok: boolean }>;
  chainNowMs: () => Promise<{ ok: true; nowMs: number } | { ok: false; error: string }>;
  status: () => unknown;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_BODY = 96 * 1024;
const MAX_SPEC_JSON = 8192;
const BUSY = "The door is busy. Try again tomorrow.";
const OPENS_PER_HOUR = 30;
const QUOTAS: Record<string, number> = { draft_spec: 10, check_spec: 60, seal_spec: 20, commit: 30 };

export function createApp(deps: Deps) {
  const app = new Hono();
  const { env } = deps;
  const authenticate = createAuthenticator({ accessKeyIsFull: deps.accessKeyIsFull, now: deps.now });

  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    const allowed = origin !== undefined && env.siteOrigins.includes(origin);
    if (origin !== undefined && !allowed) return c.json({ ok: false, error: "origin" }, 403);
    if (allowed) {
      c.header("access-control-allow-origin", origin);
      c.header("vary", "origin");
      c.header("access-control-allow-methods", "GET, POST, OPTIONS");
      c.header("access-control-allow-headers", "content-type, x-sponsor-auth");
      c.header("access-control-max-age", "600");
    }
    if (c.req.method === "OPTIONS") return c.body(null, 204);
    await next();
  });
  app.use("*", bodyLimit({ maxSize: MAX_BODY, onError: (c) => c.json({ ok: false, error: "too large" }, 413) }));

  const slow = (c: Context) => c.json({ ok: false, error: "slow down" }, 429);
  const address = (c: Context) => (c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "local");
  const take = (c: Context, name: string, max: number, windowMs: number) => deps.limiter.take(`${name}:${address(c)}`, max, windowMs);
  const bodyOf = async (c: Context): Promise<Record<string, unknown> | null> => {
    try {
      const body = await c.req.json();
      return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/status", (c) => c.json({ ok: true, keeper: deps.status(), budget: { used: deps.budget.used() }, bills: deps.bills.snapshot() }));

  app.post("/guard", async (c) => {
    if (!take(c, "guard", 240, MINUTE)) return slow(c);
    const body = await bodyOf(c);
    if (!body) return c.json({ ok: false, error: "bad request" }, 400);
    // New identities are free, so the volume is bounded here: opens per address, and bills per vault per
    // round across everyone. A refused call spends nothing at the guard.
    if (body.op === "open" && !take(c, "open", OPENS_PER_HOUR, HOUR)) return slow(c);
    if (body.op === "bill") {
      const key = `${String(body.vault_id)}|${String(body.round)}`;
      if (!deps.bills.take(key, env.roundBills)) return c.json({ ok: false, error: BUSY }, 429);
    }
    const result = await runGuardTurn(env.guard, deps.marks, body, deps.post);
    return c.json(result.body as Record<string, unknown>, result.status as 200);
  });

  app.post("/verdict", async (c) => {
    if (!take(c, "verdict", 30, MINUTE)) return slow(c);
    const body = await bodyOf(c);
    const parsed = parseVerdictSubmission(body);
    if (!parsed.ok) return c.json(parsed, 400);
    const door = await readDoor(deps.rpc, env.relay.contractId, parsed.verdict.vault_id);
    if (!door.ok) return c.json(door, 502);
    const allowed = submissionAllowed(door.vault, door.owner, env.relay.accountId, parsed.verdict, parsed.verdict.vault_id);
    if (!allowed.ok) return c.json(allowed, 409);
    const sent = await deps.submitVerdict(parsed.verdict, parsed.signature);
    if (!sent.ok) return c.json(sent, 502);
    return c.json({ ok: true, transactionHash: sent.transactionHash });
  });

  app.post("/crack", async (c) => {
    if (!take(c, "crack", 60, MINUTE)) return slow(c);
    const body = await bodyOf(c);
    const raidId = body?.raid_id;
    const vaultId = typeof body?.vault_id === "string" ? body.vault_id : env.relay.vaultId;
    if (typeof raidId !== "string" || raidId.length === 0 || !validVaultId(vaultId)) return c.json({ ok: false, error: "crack" }, 400);
    const door = await readDoor(deps.rpc, env.relay.contractId, vaultId);
    if (!door.ok) return c.json(door, 502);
    const round = Number(door.vault.round);
    if (!Number.isSafeInteger(round)) return c.json({ ok: false, error: "crack" }, 502);
    const crackResult = await deps.rpc(viewRequest(env.relay.contractId, "get_crack", { vault_id: vaultId, round, raid_id: raidId }));
    if (!crackResult.ok) return c.json(crackResult, 502);
    const crack = parseCrack(crackResult.value);
    if (!crack.ok) return c.json(crack, 502);
    const now = await deps.chainNowMs();
    if (!now.ok) return c.json(now, 502);
    return c.json({ ok: true, crack: crack.crack, nowMs: now.nowMs, vault: door.vault });
  });

  app.post("/passkey/create-account", async (c) => {
    if (!take(c, "account", 5, DAY) || !deps.limiter.take("account:all", 300, DAY)) return slow(c);
    const body = await bodyOf(c);
    if (typeof body?.publicKey !== "string") return c.json({ ok: false, error: "account" }, 400);
    const created = (await deps.createAccount(body.publicKey)) as { ok: boolean };
    return c.json(created as Record<string, unknown>, created.ok ? 200 : 502);
  });

  app.post("/passkey/sign-tx", async (c) => {
    if (!take(c, "sign", 60, HOUR) || !deps.limiter.take("sign:all", 2000, DAY)) return slow(c);
    const body = await bodyOf(c);
    if (!body) return c.json({ ok: false, error: "sign" }, 400);
    const signed = (await deps.signTransaction(body)) as { ok: boolean; hash?: string; result?: unknown };
    if (!signed.ok) return c.json(signed as Record<string, unknown>, 502);
    return c.json({ hash: signed.hash, result: signed.result });
  });

  /** One sponsor call to the guard. It is signed, counted against the account, and budgeted. */
  const sponsor = async (c: Context, op: SponsorOp, route: string, input: Record<string, unknown>) => {
    const who = await authenticate(c.req.header("x-sponsor-auth"), route);
    if (!who.ok) return c.json({ ok: false, error: "unauthorized" }, 401);
    if (!deps.limiter.take(`quota:${op}:${who.account}`, QUOTAS[op], DAY)) return c.json({ ok: false, error: "You have used today's allowance for this." }, 429);
    if (!deps.budget.take()) return c.json({ ok: false, error: "busy" }, 429);
    const posted = await deps.post(sponsorCall(env.guard, op, input));
    if (!posted.ok) return c.json({ ok: false, error: "guard" }, 502);
    const out = posted.body as Record<string, unknown> | null;
    if (!out || typeof out !== "object") return c.json({ ok: false, error: "guard" }, 502);
    return c.json(out, out.ok === true ? 200 : 422);
  };

  app.post("/sponsor/draft", async (c) => {
    if (!take(c, "sponsor", 30, HOUR)) return slow(c);
    const body = await bodyOf(c);
    const story = body?.story;
    const decimals = body?.decimals;
    if (typeof story !== "string" || story.trim().length === 0 || story.length > 2000 || !Number.isInteger(decimals)) {
      return c.json({ ok: false, error: "bad request" }, 400);
    }
    return sponsor(c, "draft_spec", "/sponsor/draft", { story, decimals });
  });

  app.post("/sponsor/check", async (c) => {
    if (!take(c, "sponsor", 30, HOUR)) return slow(c);
    const body = await bodyOf(c);
    const cap = body?.cap;
    if (!body || typeof cap !== "string" || !/^[0-9]+$/.test(cap) || !specFits(body.spec)) return c.json({ ok: false, error: "bad request" }, 400);
    return sponsor(c, "check_spec", "/sponsor/check", { spec: body.spec, cap });
  });

  app.post("/sponsor/seal", async (c) => {
    if (!take(c, "sponsor", 30, HOUR)) return slow(c);
    const body = await bodyOf(c);
    const vaultId = body?.vault_id;
    const cap = body?.cap;
    if (!body || typeof vaultId !== "string" || !validVaultId(vaultId) || !specFits(body.spec) || typeof cap !== "string" || !/^[0-9]+$/.test(cap)) {
      return c.json({ ok: false, error: "bad request" }, 400);
    }
    return sponsor(c, "seal_spec", "/sponsor/seal", { vault_id: vaultId, spec: body.spec, cap, ack_hint: body.ack_hint === true });
  });

  /** The server works out the round and reads the spec from chain. A caller picks only the vault. */
  app.post("/sponsor/commit", async (c) => {
    if (!take(c, "sponsor", 30, HOUR)) return slow(c);
    const body = await bodyOf(c);
    const vaultId = body?.vault_id;
    if (typeof vaultId !== "string" || !validVaultId(vaultId)) return c.json({ ok: false, error: "bad request" }, 400);
    const who = await authenticate(c.req.header("x-sponsor-auth"), "/sponsor/commit");
    if (!who.ok) return c.json({ ok: false, error: "unauthorized" }, 401);
    if (!deps.limiter.take(`quota:commit:${who.account}`, QUOTAS.commit, DAY)) return c.json({ ok: false, error: "You have used today's allowance for this." }, 429);
    const result = await requestCommit({ rpc: deps.rpc, post: deps.post, guard: env.guard, contractId: env.relay.contractId, vaultId, admit: () => deps.budget.take() });
    if (!result.ok) return c.json({ ok: false, error: result.error }, result.status as 409);
    const { commit } = result;
    return c.json({ ok: true, commitment: commit.commitment, guard_version: commit.guardVersion, signature: commit.signature, round: commit.round });
  });

  return app;
}

function specFits(spec: unknown): boolean {
  if (!spec || typeof spec !== "object") return false;
  try {
    return JSON.stringify(spec).length <= MAX_SPEC_JSON;
  } catch {
    return false;
  }
}
