import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { readDoor, type Rpc } from "../../web/lib/chain.ts";
import { parseCard } from "../../web/lib/card.ts";
import { doorFull, doorShut } from "../../web/lib/door.ts";
import { runGuardTurn } from "../../web/lib/guard-turn.ts";
import type { Mark } from "../../web/lib/marks.ts";
import { parseVerdictSubmission, submissionAllowed, type VerdictBody } from "../../web/lib/verdict-turn.ts";
import { parseCrack, viewRequest } from "../../web/lib/vault.ts";
import { validVaultId } from "../../web/lib/preflight.ts";
import { requestCommit } from "./commit-flow.ts";
import type { ServerEnv } from "./env.ts";
import { sponsorCall, type Post, type SponsorOp } from "./guard-client.ts";
import type { Budget, Counter, Limiter } from "./limits.ts";
import { draftFitsCap } from "./sponsor-draft.ts";
import { createAuthenticator } from "./auth.ts";
import { createPlayerAuth } from "./player-auth.ts";
import { BOARD_RULE, WEEK_RULE, boardEntry, weekStart, weeklyBoard, openSession, publicBoard, parseProgress, recordGotIn, recordOpen, recordProgress, recordTurn, renamePlayer, rollName, utcDay, viewOf, type NightRow, type PlayerRow, type PlayerStore } from "./player-record.ts";
import { playerNameToStore } from "../../web/lib/player-name.ts";
import type { ClaimRelay } from "./claim-relay.ts";
import { usesSamplePayee } from "../../web/lib/sample-spec.ts";
import { accountIdForPublicKey } from "../../web/lib/passkey-account.ts";

export type Deps = {
  env: ServerEnv;
  rpc: Rpc;
  post: Post;
  generateDraft?: (story: string, decimals: number, cap?: string) => Promise<unknown>;
  now: () => number;
  limiter: Limiter;
  budget: Budget;
  bills: Counter;
  accessKeyIsFull: (account: string, publicKey: string) => Promise<boolean | null>;
  marks: Map<string, Mark>;
  /** Absent until SurrealDB is configured. The phone is not the record. */
  players?: PlayerStore;
  /** True only when the verdict key last read from the chain as scoped to `submit_verdict` on the vault (plan 73). */
  verdictKeyReady: () => boolean;
  submitVerdict: (verdict: VerdictBody, signature: number[]) => Promise<{ ok: true; transactionHash: string } | { ok: false; error: string; reason?: string }>;
  createAccount: (publicKey: string) => Promise<unknown & { ok: boolean }>;
  /** Sends a claim the player signed and pays its gas from the relay. */
  relayClaim: ClaimRelay;
  chainNowMs: () => Promise<{ ok: true; nowMs: number } | { ok: false; error: string }>;
  status: () => unknown;
  /** Looks a guard call's attestation up at OutLayer. Absent in tests that do not need it. */
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_BODY = 96 * 1024;
const MAX_SPEC_JSON = 8192;
const MAX_CAP = (1n << 128n) - 1n;
const BUSY = "The door is busy. Try again tomorrow.";
const OPENS_PER_HOUR = 30;
const QUOTAS: Record<string, number> = { draft_spec: 10, check_spec: 60, seal_spec: 20, commit: 30 };

export function createApp(deps: Deps) {
  const app = new Hono();
  const { env } = deps;
  const authenticate = createAuthenticator({ accessKeyIsFull: deps.accessKeyIsFull, now: deps.now });

  app.use("*", async (c, next) => {
    // Every answer is JSON for a fetch, never a page, so it is not sniffed, framed or sent with a referrer.
    c.header("x-content-type-options", "nosniff");
    c.header("x-frame-options", "DENY");
    c.header("referrer-policy", "no-referrer");
    c.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    const origin = c.req.header("origin");
    const allowed = origin !== undefined && env.siteOrigins.includes(origin);
    if (origin !== undefined && !allowed) return c.json({ ok: false, error: "origin" }, 403);
    if (allowed) {
      c.header("access-control-allow-origin", origin);
      c.header("vary", "origin");
      c.header("access-control-allow-methods", "GET, POST, OPTIONS");
      c.header("access-control-allow-headers", "content-type, x-sponsor-auth, x-player-auth");
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
  app.get("/status", (c) => c.json({ ok: true, ...statusParts(deps.status()), budget: { used: deps.budget.used() }, bills: deps.bills.snapshot() }));

  const playerAuth = createPlayerAuth(deps.now);

  app.post("/guard", async (c) => {
    if (!take(c, "guard", 240, MINUTE)) return slow(c);
    const body = await bodyOf(c);
    if (!body) return c.json({ ok: false, error: "bad request" }, 400);
    // New identities are free, so the volume is bounded here: opens per address, and bills per vault per
    // round across everyone. A refused call spends nothing at the guard.
    if (body.op === "open" && !take(c, "open", OPENS_PER_HOUR, HOUR)) return slow(c);
    // A round that is shut, past its close, or not the vault's current round sells no raid and answers no
    // message, so its street hints cannot be read after close by calling this route directly. A round with
    // every crack taken sells no raid and signs no verdict. If the read fails the turn goes on, because the
    // vault refuses a late or extra verdict anyway.
    if ((body.op === "open" || body.op === "say" || body.op === "bill") && typeof body.vault_id === "string" && validVaultId(body.vault_id)) {
      const door = await readDoor(deps.rpc, env.relay.contractId, body.vault_id);
      if (door.ok && (doorShut(door.vault, deps.now()) || String(body.round) !== door.vault.round)) return c.json({ ok: false, error: "closed" }, 409);
      if (door.ok && body.op !== "say" && doorFull(door.vault)) return c.json({ ok: false, error: "full" }, 409);
    }
    // A message or a bill is signed by the same passkey that opened the raid, so a caller with no sign-in cannot
    // spend a guard call or the round's bills. The bill is counted only after that, against a round that is open.
    if (body.op === "say" || body.op === "bill") {
      const who = playerAuth(c.req.header("x-player-auth"), `/guard/${body.op}`);
      if (!who.ok || who.claimKey !== body.player_id) return c.json({ ok: false, error: "unauthorized" }, 401);
    }
    if (body.op === "bill") {
      const key = `${String(body.vault_id)}|${String(body.round)}`;
      if (!deps.bills.take(key, env.roundBills)) return c.json({ ok: false, error: BUSY }, 429);
    }
    // A door's sponsor wrote the ledger, so the sponsor never gets a raid. The passkey signs this call with its
    // account key and the claim key, so the account behind the claim key is the one checked, not a page's claim.
    if (body.op === "open") {
      const who = playerAuth(c.req.header("x-player-auth"), "/guard/open");
      if (!who.ok || who.claimKey !== body.player_id) return c.json({ ok: false, error: "unauthorized" }, 401);
      if (typeof body.vault_id !== "string" || !validVaultId(body.vault_id)) return c.json({ ok: false, error: "bad request" }, 400);
      // The player record pairs one account key with one claim key the first time a passkey is seen. A claim
      // key shown with a different account key is refused, so the sponsor check below cannot be stepped round by
      // signing with a fresh account key. A record that cannot be read leaves the vault as the final check.
      if (deps.players) {
        const bound = await openSession(deps.players, { publicKey: who.publicKey, claimKey: who.claimKey, now: deps.now() }).catch(() => null);
        if (bound && !bound.ok) return c.json({ ok: false, error: "unauthorized" }, 401);
      }
      const door = await readDoor(deps.rpc, env.relay.contractId, body.vault_id);
      if (!door.ok) return c.json({ ok: false, error: "door" }, 502);
      const account = await accountIdForPublicKey(who.publicKey, env.relay.accountId);
      if (account && (account === door.vault.sponsor || account === door.owner)) return c.json({ ok: false, error: "sponsor" }, 403);
    }
    const result = await runGuardTurn(env.guard, deps.marks, body, deps.post);
    if (deps.players && result.status === 200) {
      const payload = result.body as { ok?: unknown; blob?: unknown };
      if (payload?.ok === true && body.op === "open" && typeof payload.blob === "string" && typeof body.player_id === "string" && typeof body.vault_id === "string") {
        await recordProgress(deps.players, { claimKey: body.player_id, vaultId: body.vault_id, round: String(body.round), ...(typeof (payload as { used?: unknown }).used === "number" ? { used: (payload as { used: number }).used } : {}), street: (payload as { street?: unknown }).street ?? null }).catch(() => undefined);
        await recordOpen(deps.players, { claimKey: body.player_id, vaultId: body.vault_id, round: String(body.round), blob: payload.blob, now: deps.now() }).catch(() => undefined);
      }
      if (payload?.ok === true && (body.op === "say" || body.op === "bill") && typeof payload.blob === "string" && typeof body.player_id === "string" && typeof body.vault_id === "string") {
        await recordTurn(deps.players, { claimKey: body.player_id, vaultId: body.vault_id, round: String(body.round), blob: payload.blob }).catch(() => undefined);
        const answer = payload as { reply?: unknown; used?: unknown; signature?: unknown; verdict?: unknown };
        // One outcome per counted message: chat is "ask", a bill is refused or approved. The text is not kept.
        if (typeof answer.reply === "string" && answer.reply) {
          const outcome = body.op === "say" ? "ask" : answer.signature && answer.verdict ? "approved" : "refused";
          await recordProgress(deps.players, { claimKey: body.player_id, vaultId: body.vault_id, round: String(body.round), outcome, ...(typeof answer.used === "number" ? { used: answer.used } : {}) }).catch(() => undefined);
        }
      }
    }
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
    // A key that is not provably scoped is not used, so the verdict waits and the browser keeps it to send again.
    if (!deps.verdictKeyReady()) return c.json({ ok: false, error: "key" }, 503);
    const sent = await deps.submitVerdict(parsed.verdict, parsed.signature);
    // A refusal will be the same on every send, so it is a 422 and the browser does not retry it.
    if (!sent.ok) return c.json(sent, sent.error === "refused" || sent.error === "number" ? 422 : 502);
    if (deps.players) {
      await recordGotIn(deps.players, { claimKey: parsed.verdict.player_id, vaultId: parsed.verdict.vault_id, round: parsed.verdict.round, now: deps.now() }).catch(() => undefined);
      await recordProgress(deps.players, { claimKey: parsed.verdict.player_id, vaultId: parsed.verdict.vault_id, round: parsed.verdict.round, won: true, amount: String(parsed.verdict.amount) }).catch(() => undefined);
    }
    return c.json({ ok: true, transactionHash: sent.transactionHash });
  });

  app.post("/crack", async (c) => {
    if (!take(c, "crack", 60, MINUTE)) return slow(c);
    const body = await bodyOf(c);
    const raidId = body?.raid_id;
    const vaultId = typeof body?.vault_id === "string" ? body.vault_id : "";
    if (typeof raidId !== "string" || raidId.length === 0 || !validVaultId(vaultId)) return c.json({ ok: false, error: "crack" }, 400);
    const door = await readDoor(deps.rpc, env.relay.contractId, vaultId);
    if (!door.ok) return c.json(door, 502);
    const current = Number(door.vault.round);
    if (!Number.isSafeInteger(current)) return c.json({ ok: false, error: "crack" }, 502);
    // A past round can be asked for by number; a round the vault has not reached is refused.
    const asked = body?.round === undefined ? current : Number(body.round);
    if (!Number.isSafeInteger(asked) || asked < 1 || asked > current) return c.json({ ok: false, error: "crack" }, 400);
    const round = asked;
    const crackResult = await deps.rpc(viewRequest(env.relay.contractId, "get_crack", { vault_id: vaultId, round, raid_id: raidId }));
    if (!crackResult.ok) return c.json(crackResult, 502);
    const crack = parseCrack(crackResult.value);
    if (!crack.ok) return c.json(crack, 502);
    const now = await deps.chainNowMs();
    if (!now.ok) return c.json(now, 502);
    return c.json({ ok: true, crack: crack.crack, nowMs: now.nowMs, vault: door.vault });
  });

  app.post("/passkey/account", async (c) => {
    if (!take(c, "account-id", 60, MINUTE)) return slow(c);
    const body = await bodyOf(c);
    if (typeof body?.publicKey !== "string") return c.json({ ok: false, error: "account" }, 400);
    const accountId = await accountIdForPublicKey(body.publicKey, deps.env.relay.accountId);
    if (!accountId) return c.json({ ok: false, error: "account" }, 400);
    return c.json({ ok: true, accountId });
  });

  app.post("/passkey/create-account", async (c) => {
    if (!take(c, "account", 5, DAY) || !deps.limiter.take("account:all", 300, DAY)) return slow(c);
    const body = await bodyOf(c);
    if (typeof body?.publicKey !== "string") return c.json({ ok: false, error: "account" }, 400);
    const created = (await deps.createAccount(body.publicKey)) as { ok: boolean };
    return c.json(created as Record<string, unknown>, created.ok ? 200 : 502);
  });

  app.post("/passkey/claim", async (c) => {
    if (!take(c, "claim", 20, HOUR) || !deps.limiter.take("claim:all", 500, DAY)) return slow(c);
    const body = await bodyOf(c);
    if (!body) return c.json({ ok: false, error: "claim" }, 400);
    const sent = await deps.relayClaim(body);
    if (sent.ok) return c.json({ ok: true, hash: sent.hash });
    return c.json(sent, sent.error === "refused" ? 422 : 502);
  });

  /** One sponsor call to the guard. It is signed, counted against the account, and budgeted. */
  const sponsor = async (c: Context, op: SponsorOp, route: string, input: Record<string, unknown>) => {
    const who = await authenticate(c.req.header("x-sponsor-auth"), route);
    if (!who.ok) return c.json({ ok: false, error: "unauthorized" }, 401);
    if (!deps.limiter.take(`quota:${op}:${who.account}`, QUOTAS[op], DAY)) return c.json({ ok: false, error: "You have used today's allowance for this." }, 429);
    if (!deps.budget.take()) return c.json({ ok: false, error: "busy" }, 429);
    // The sample story's payees are printed on the form, so a door that uses them has a ledger anyone can read.
    if ((op === "seal_spec" || op === "check_spec") && usesSamplePayee(input.spec)) return c.json({ ok: false, error: "sample" }, 422);
    if (op === "draft_spec" && input.cap !== undefined && !deps.generateDraft) {
      return c.json({ ok: false, error: "model" }, 422);
    }
    if (op === "draft_spec" && deps.generateDraft) {
      const requestedCap = input.cap as string | undefined;
      // The model sometimes writes a story the guard will not read. One more draft is tried before giving up,
      // inside the same allowance, so the sponsor does not have to press again.
      let failure: { status: 422 | 502; body: Record<string, unknown> } = { status: 422, body: { ok: false, error: "model" } };
      for (let attempt = 0; attempt < 2; attempt++) {
        const spec = await deps.generateDraft(input.story as string, input.decimals as number, requestedCap);
        if (!specFits(spec)) {
          failure = { status: 422, body: { ok: false, error: "model" } };
          continue;
        }
        // The test refuses the form's sample payees, so a draft that copies them would only strand the sponsor.
        if (usesSamplePayee(spec)) {
          failure = { status: 422, body: { ok: false, error: "spec", detail: "The draft came back with the sample payees. Try again, or write the story by hand." } };
          continue;
        }
        const cap = requestedCap ?? MAX_CAP.toString();
        const checked = await deps.post(sponsorCall(env.guard, "check_spec", { spec, cap }));
        if (!checked.ok) return c.json({ ok: false, error: "guard" }, 502);
        const report = checked.body as { ok?: boolean; spec_hash?: string; pass?: boolean } | null;
        if (report?.ok !== true || typeof report.spec_hash !== "string") {
          failure = { status: 422, body: { ok: false, error: "spec" } };
          continue;
        }
        if (requestedCap !== undefined && (report.pass !== true || !draftFitsCap(spec, BigInt(requestedCap), input.decimals as number))) {
          failure = { status: 422, body: { ok: false, error: "spec", detail: "The draft did not pass the fairness check for your cap. Try again or edit the spec by hand." } };
          continue;
        }
        return c.json({ ok: true, spec });
      }
      return c.json(failure.body, failure.status);
    }
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
    if (typeof story !== "string" || story.trim().length === 0 || story.length > 2000 || typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 2 || decimals > 18) {
      return c.json({ ok: false, error: "bad request" }, 400);
    }
    const cap = body?.cap;
    if (cap !== undefined && (typeof cap !== "string" || !/^[1-9][0-9]{0,38}$/.test(cap) || BigInt(cap) > MAX_CAP)) {
      return c.json({ ok: false, error: "bad cap" }, 400);
    }
    return sponsor(c, "draft_spec", "/sponsor/draft", { story, decimals, ...(cap === undefined ? {} : { cap }) });
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

  const player = async (c: Context, route: string) => {
    if (!deps.players) return null;
    const who = playerAuth(c.req.header("x-player-auth"), route);
    return who.ok ? who : null;
  };
  const unavailable = (c: Context) => c.json({ ok: false, error: "record" }, 503);
  const stored = async (c: Context, run: () => Promise<Response>) => {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "error";
      console.error("player record", message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 200));
      return unavailable(c);
    }
  };

  app.post("/player/session", (c) => stored(c, async () => {
    if (!take(c, "player", 30, MINUTE)) return slow(c);
    if (!deps.players) return unavailable(c);
    const who = await player(c, "/player/session");
    if (!who) return c.json({ ok: false, error: "unauthorized" }, 401);
    const opened = await openSession(deps.players, { ...who, now: deps.now() });
    if (!opened.ok) return c.json(opened, 409);
    return c.json(await playerView(deps.players, opened.player, opened.nights, deps.now()));
  }));

  app.post("/player/roll", (c) => stored(c, async () => {
    if (!take(c, "player", 30, MINUTE)) return slow(c);
    if (!deps.players) return unavailable(c);
    const who = await player(c, "/player/roll");
    if (!who) return c.json({ ok: false, error: "unauthorized" }, 401);
    const rolled = await rollName(deps.players, who.publicKey);
    if (!rolled.ok) return c.json(rolled, 409);
    const nights = await deps.players.nightsFor(rolled.player.claimKey);
    return c.json(await playerView(deps.players, rolled.player, nights, deps.now()));
  }));

  app.post("/player/name", (c) => stored(c, async () => {
    if (!take(c, "player", 30, MINUTE)) return slow(c);
    if (!deps.players) return unavailable(c);
    const who = await player(c, "/player/name");
    if (!who) return c.json({ ok: false, error: "unauthorized" }, 401);
    const body = await bodyOf(c);
    if (!playerNameToStore(typeof body?.name === "string" ? body.name : "")) return c.json({ ok: false, error: "name" }, 400);
    const renamed = await renamePlayer(deps.players, who.publicKey, String(body?.name));
    if (!renamed.ok) return c.json(renamed, 409);
    const nights = await deps.players.nightsFor(renamed.player.claimKey);
    return c.json(await playerView(deps.players, renamed.player, nights, deps.now()));
  }));

  app.post("/player/resume", (c) => stored(c, async () => {
    if (!take(c, "player", 30, MINUTE)) return slow(c);
    if (!deps.players) return unavailable(c);
    const who = await player(c, "/player/resume");
    if (!who) return c.json({ ok: false, error: "unauthorized" }, 401);
    const body = await bodyOf(c);
    const vaultId = typeof body?.vaultId === "string" ? body.vaultId : "";
    const round = typeof body?.round === "string" ? body.round : "";
    if (!validVaultId(vaultId) || !/^[0-9]+$/.test(round)) return c.json({ ok: false, error: "bad request" }, 400);
    const blob = await deps.players.readBlob(who.claimKey, vaultId, round);
    // Progress is extra: a failed read still hands back the blob, which is what continues the raid.
    const progress = parseProgress(await deps.players.readProgress(who.claimKey, vaultId, round).catch(() => null));
    return c.json({ ok: true, blob, progress });
  }));

  app.get("/player/board", (c) => stored(c, async () => {
    if (!deps.players) return unavailable(c);
    const today = utcDay(deps.now());
    const week = c.req.query("period") === "week";
    const board = week ? weeklyBoard(await deps.players.allPlayers(), await deps.players.nightsSince(weekStart(today)), today) : publicBoard(await deps.players.allPlayers(), today);
    const limit = Math.min(100, Math.max(1, Number.parseInt(c.req.query("limit") ?? "50", 10) || 50));
    const offset = Math.max(0, Number.parseInt(c.req.query("offset") ?? "0", 10) || 0);
    return c.json({ ok: true, players: board.slice(offset, offset + limit), total: board.length, offset, rule: week ? WEEK_RULE : BOARD_RULE });
  }));

  /** One player's place, so a place page does not download the whole board. */
  app.get("/player/place/:name", (c) => stored(c, async () => {
    if (!deps.players) return unavailable(c);
    const name = c.req.param("name");
    if (name.length < 1 || name.length > 40) return c.json({ ok: false, error: "name" }, 400);
    const board = publicBoard(await deps.players.allPlayers(), utcDay(deps.now()));
    return c.json({ ok: true, player: boardEntry(board, name), total: board.length, rule: BOARD_RULE });
  }));

  /** A player's last nights: the door's name, the day, and whether they got in. Never a bill. */
  app.get("/player/recent/:name", (c) => stored(c, async () => {
    if (!deps.players) return unavailable(c);
    if (!take(c, "recent", 60, MINUTE)) return slow(c);
    const name = playerNameToStore(c.req.param("name"));
    if (!name) return c.json({ ok: false, error: "name" }, 404);
    const player = await deps.players.findByName(name);
    if (!player) return c.json({ ok: true, nights: [] });
    const nights = (await deps.players.nightsFor(player.claimKey)).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0)).slice(0, 8);
    const signs = new Map<string, string>();
    for (const id of new Set(nights.map((night) => night.vaultId))) {
      const door = await readDoor(deps.rpc, env.relay.contractId, id);
      const card = door.ok ? parseCard(door.vault.card) : null;
      signs.set(id, card && card.ok && card.card.sign ? card.card.sign : id);
    }
    return c.json({ ok: true, nights: nights.map((night) => ({ door: signs.get(night.vaultId) ?? night.vaultId, vaultId: night.vaultId, round: night.round, day: night.day, state: night.state })) });
  }));

  app.get("/player/share/:name", (c) => stored(c, async () => {
    if (!deps.players) return unavailable(c);
    const name = playerNameToStore(c.req.param("name"));
    if (!name) return c.json({ ok: false, error: "name" }, 404);
    const board = publicBoard(await deps.players.allPlayers(), utcDay(deps.now()));
    const row = board.find((player) => player.name === name);
    if (!row) return c.json({ ok: false, error: "name" }, 404);
    return c.json({ ok: true, player: row });
  }));

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

async function playerView(store: PlayerStore, player: PlayerRow, nights: NightRow[], now: number) {
  const today = utcDay(now);
  const board = publicBoard(await store.allPlayers(), today);
  const place = boardEntry(board, player.name);
  return {
    ok: true as const,
    player: viewOf(player, today),
    place: place?.place ?? null,
    line: place?.line ?? null,
    nights: nights.map((night) => ({ vaultId: night.vaultId, round: night.round, state: night.state, day: night.day })),
  };
}

/** The keeper's own status, and the relay's balance state when the process watches it. */
function statusParts(status: unknown): Record<string, unknown> {
  if (status && typeof status === "object" && "relay" in status) return status as Record<string, unknown>;
  return { keeper: status };
}
