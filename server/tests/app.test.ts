import assert from "node:assert/strict";
import test from "node:test";
import { KeyPair } from "near-api-js";
import { accountIdForPublicKey } from "../../web/lib/passkey-account.ts";
import { createApp } from "../src/app.ts";
import { authHeader, playerOpen, SECRETS, openRow, testDeps, vaultRow } from "./testkit.ts";

const ORIGIN = "https://site.test";
const post = (path: string, body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
  body: JSON.stringify(body),
});

const signed = (route: string, body: unknown, over: Parameters<typeof authHeader>[1] = {}) => post(route, body, { "x-sponsor-auth": authHeader(route, over) });

test("only the site's origin is answered, and preflight is handled", async () => {
  const app = createApp(testDeps().deps);
  const ok = await app.request("/health", { headers: { origin: ORIGIN } });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("access-control-allow-origin"), ORIGIN);
  const other = await app.request("/health", { headers: { origin: "https://evil.test" } });
  assert.equal(other.status, 403);
  assert.equal(other.headers.get("access-control-allow-origin"), null);
  const pre = await app.request("/guard", { method: "OPTIONS", headers: { origin: ORIGIN } });
  assert.equal(pre.status, 204);
  const bare = await app.request("/health");
  assert.equal(bare.status, 200);
});

test("a passkey account id is named without creating the account", async () => {
  const { deps } = testDeps();
  let created = 0;
  deps.createAccount = async () => {
    created += 1;
    return { ok: true };
  };
  const publicKey = `ed25519:${"2".repeat(44)}`;
  const expected = await accountIdForPublicKey(publicKey, "relay.test");
  const app = createApp(deps);
  const named = await app.request("/passkey/account", post("/passkey/account", { publicKey }));
  assert.equal(named.status, 200);
  assert.equal(((await named.json()) as { accountId: string }).accountId, expected);
  assert.equal(created, 0);
  assert.equal((await app.request("/passkey/account", post("/passkey/account", { publicKey: "nope" }))).status, 400);
});

test("browser sponsor preflights allow the signed header without executing a guard call", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  for (const path of ["/sponsor/draft", "/sponsor/check", "/sponsor/seal", "/sponsor/commit"]) {
    const response = await app.request(path, {
      method: "OPTIONS",
      headers: { origin: ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "content-type,x-sponsor-auth" },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
    const allowed = response.headers.get("access-control-allow-headers")!.toLowerCase().split(",").map((h) => h.trim());
    assert.ok(allowed.includes("content-type"));
    assert.ok(allowed.includes("x-sponsor-auth"), path);
    assert.equal(allowed.includes("*"), false);
  }
  assert.equal(posts.length, 0);
  const denied = await app.request("/sponsor/draft", {
    method: "OPTIONS", headers: { origin: "https://evil.test", "access-control-request-method": "POST", "access-control-request-headers": "x-sponsor-auth" },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  assert.equal((await app.request("/sponsor/draft", post("/sponsor/draft", { story: "hello", decimals: 6 }))).status, 401);
  assert.equal(posts.length, 0);
});

test("a body over the limit is refused", async () => {
  const app = createApp(testDeps().deps);
  const res = await app.request("/guard", post("/guard", { op: "say", pad: "x".repeat(100_000) }));
  assert.equal(res.status, 413);
});

test("/guard runs the four player ops and refuses the sponsor ops", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  const who = playerOpen("/guard/open");
  const open = await app.request("/guard", post("/guard", { op: "open", vault_id: "velvet-1", round: 1, player_id: who.claimKey, raid_id: "r1" }, { "x-player-auth": who.header }));
  assert.equal(open.status, 200);
  assert.equal(posts.length, 1);
  for (const op of ["seal_spec", "check_spec", "draft_spec", "commit", "pubkey"]) {
    const res = await app.request("/guard", post("/guard", { op, vault_id: "velvet-1", round: 1, player_id: "p1" }));
    assert.equal(res.status, 400, op);
  }
  assert.equal(posts.length, 1);
});

test("/guard is limited per address", async () => {
  const app = createApp(testDeps().deps);
  let last = 200;
  for (let i = 0; i < 241; i += 1) {
    last = (await app.request("/guard", post("/guard", { op: "say" }, { "x-forwarded-for": "1.2.3.4" }))).status;
  }
  assert.equal(last, 429);
  const other = await app.request("/guard", post("/guard", { op: "say" }, { "x-forwarded-for": "5.6.7.8" }));
  assert.notEqual(other.status, 429);
});

const verdict = (vault: string) => ({
  verdict: {
    vault_id: vault, round: "1", raid_id: "r1", player_id: "p1", bill_hash: Array(32).fill(1), amount: "5",
    claim_pk: Array(32).fill(2), conversation_hash: Array(32).fill(3), guard_version: Array(32).fill(4),
  },
  signature: Array(64).fill(9),
});

test("/verdict reads the vault the verdict names and keeps the guest rules", async () => {
  const { deps, views } = testDeps();
  const app = createApp(deps);
  const sent = await app.request("/verdict", post("/verdict", verdict("anchor")));
  assert.equal(sent.status, 200);
  assert.ok(views.calls.some((c) => c.method === "get_vault" && c.args.vault_id === "anchor"));
  views.vaults.anchor = vaultRow({ ticketed: true });
  assert.equal((await app.request("/verdict", post("/verdict", verdict("anchor")))).status, 409);
  assert.equal((await app.request("/verdict", post("/verdict", verdict("nope")))).status, 502);
  views.vaults.anchor = vaultRow({ round: "2" });
  assert.equal((await app.request("/verdict", post("/verdict", verdict("anchor")))).status, 409);
});

test("/verdict is held when the verdict key is not provably scoped", async () => {
  const { deps } = testDeps();
  let sent = 0;
  deps.verdictKeyReady = () => false;
  deps.submitVerdict = async () => { sent += 1; return { ok: true, transactionHash: "hash" }; };
  const res = await createApp(deps).request("/verdict", post("/verdict", verdict("anchor")));
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false, error: "key" });
  assert.equal(sent, 0);
});

test("/verdict refuses a relay that owns the vault", async () => {
  const { deps } = testDeps({}, { vaults: { anchor: vaultRow() }, specs: {}, owner: "relay.test", calls: [] });
  const res = await createApp(deps).request("/verdict", post("/verdict", verdict("anchor")));
  assert.equal(res.status, 409);
});

test("/verdict answers a contract refusal with 422, so the browser does not send it again", async () => {
  const { deps } = testDeps();
  deps.submitVerdict = async () => ({ ok: false, error: "refused", reason: "Smart contract panicked: not open" });
  const res = await createApp(deps).request("/verdict", post("/verdict", verdict("anchor")));
  assert.equal(res.status, 422);
  assert.deepEqual(await res.json(), { ok: false, error: "refused", reason: "Smart contract panicked: not open" });
  deps.submitVerdict = async () => ({ ok: false, error: "rpc" });
  assert.equal((await createApp(deps).request("/verdict", post("/verdict", verdict("anchor")))).status, 502);
});

test("/crack defaults to the env vault and takes a vault id", async () => {
  const { deps, views } = testDeps();
  const app = createApp(deps);
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "r1" }))).status, 200);
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "r1", vault_id: "anchor" }))).status, 200);
  assert.ok(views.calls.some((c) => c.method === "get_crack" && c.args.vault_id === "anchor"));
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "" }))).status, 400);
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "r1", vault_id: "bad id!" }))).status, 400);
});

test("/crack reads a past round by number and refuses one the vault has not reached", async () => {
  const { deps, views } = testDeps();
  const app = createApp(deps);
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "r1", vault_id: "anchor", round: "1" }))).status, 200);
  assert.ok(views.calls.some((c) => c.method === "get_crack" && c.args.round === 1));
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "r1", vault_id: "anchor", round: "999999" }))).status, 400);
  assert.equal((await app.request("/crack", post("/crack", { raid_id: "r1", vault_id: "anchor", round: "0" }))).status, 400);
});

test("account creation is limited per address, and the old fast-auth signing route is gone", async () => {
  const app = createApp(testDeps().deps);
  let last = 200;
  for (let i = 0; i < 6; i += 1) last = (await app.request("/passkey/create-account", post("/x", { publicKey: "ed25519:abc" }))).status;
  assert.equal(last, 429);
  assert.equal((await app.request("/passkey/sign-tx", post("/x", { guard_id: "g" }, { "x-forwarded-for": "9.9.9.9" }))).status, 404);
  assert.equal((await app.request("/passkey/create-account", post("/x", {}, { "x-forwarded-for": "8.8.8.8" }))).status, 400);
});

test("each sponsor route validates its body and sends only its own op", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  assert.equal((await app.request("/sponsor/draft", signed("/sponsor/draft", { story: "", decimals: 6 }))).status, 400);
  assert.equal((await app.request("/sponsor/draft", signed("/sponsor/draft", { story: "A club.", decimals: 6.5 }))).status, 400);
  assert.equal((await app.request("/sponsor/check", signed("/sponsor/check", { spec: {}, cap: "-1" }))).status, 400);
  assert.equal((await app.request("/sponsor/check", signed("/sponsor/check", { spec: "text", cap: "5" }))).status, 400);
  assert.equal((await app.request("/sponsor/seal", signed("/sponsor/seal", { vault_id: "bad id", spec: {} }))).status, 400);
  assert.equal((await app.request("/sponsor/seal", signed("/sponsor/seal", { vault_id: "anchor", spec: { pad: "x".repeat(9000) } }))).status, 400);
  assert.equal(posts.length, 0);
  assert.equal((await app.request("/sponsor/draft", signed("/sponsor/draft", { story: "A club.", decimals: 6 }))).status, 200);
  assert.equal((await app.request("/sponsor/check", signed("/sponsor/check", { spec: { v: 1 }, cap: "500" }))).status, 200);
  assert.equal((await app.request("/sponsor/seal", signed("/sponsor/seal", { vault_id: "anchor", spec: { v: 1 }, cap: "500" }))).status, 200);
  assert.deepEqual(posts.map((p) => p.op), ["draft_spec", "check_spec", "seal_spec"]);
});

test("sponsor calls stop at the daily budget", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  for (let i = 0; i < 3; i += 1) assert.equal((await app.request("/sponsor/draft", signed("/sponsor/draft", { story: "A club.", decimals: 6 }))).status, 200);
  assert.equal((await app.request("/sponsor/draft", signed("/sponsor/draft", { story: "A club.", decimals: 6 }))).status, 429);
  assert.equal(posts.length, 3);
});

test("a guard sentence about the sponsor's spec is passed on", async () => {
  const { deps } = testDeps({ post: async () => ({ ok: true, body: { ok: false, error: "spec", detail: "Line 2: the payee needs at least 4 letters." } }) });
  const res = await createApp(deps).request("/sponsor/check", signed("/sponsor/check", { spec: { v: 1 }, cap: "5" }));
  assert.equal(res.status, 422);
  assert.equal(((await res.json()) as { detail: string }).detail, "Line 2: the payee needs at least 4 letters.");
});

test("/sponsor/commit reads the round and the spec from chain, and a caller cannot choose them", async () => {
  const { deps, posts, views } = testDeps();
  views.vaults.anchor = vaultRow({ round: "4", closed_pending_bump: true });
  const res = await createApp(deps).request("/sponsor/commit", signed("/sponsor/commit", { vault_id: "anchor", round: 99, spec_ct: "ff", commitment: "00" }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { round: number; signature: string };
  assert.equal(body.round, 5);
  assert.equal(posts[0].op, "commit");
  assert.equal(posts[0].input.round, 5);
  assert.equal(posts[0].input.spec_ct, "010203");
  assert.equal(posts[0].input.commitment, undefined);
});

test("/sponsor/commit refuses an open, a suspended, and an unreadable vault", async () => {
  const { deps, views, posts } = testDeps();
  const app = createApp(deps);
  views.vaults.anchor = vaultRow({ open: true });
  assert.equal((await app.request("/sponsor/commit", signed("/sponsor/commit", { vault_id: "anchor" }))).status, 409);
  views.vaults.anchor = vaultRow({ suspended: true });
  assert.equal((await app.request("/sponsor/commit", signed("/sponsor/commit", { vault_id: "anchor" }))).status, 409);
  assert.equal((await app.request("/sponsor/commit", signed("/sponsor/commit", { vault_id: "ghost" }))).status, 502);
  views.vaults.anchor = vaultRow();
  views.specs.anchor = null;
  assert.equal((await app.request("/sponsor/commit", signed("/sponsor/commit", { vault_id: "anchor" }))).status, 502);
  assert.equal(posts.length, 0);
});

test("/status shows no secret", async () => {
  const { deps } = testDeps({ status: () => ({ anchor: { action: "opened", detail: "round 1 hash" } }) });
  const body = await (await createApp(deps).request("/status")).text();
  for (const secret of SECRETS) assert.equal(body.includes(secret), false);
  assert.ok(body.includes("anchor"));
});

test("server-generated drafts require authentication and guard schema acceptance", async () => {
  const { deps } = testDeps();
  const path = "/sponsor/draft";
  const input = { story: "A club.", decimals: 6 };
  const spec = { v: 1, decimals: 6, salt: "00".repeat(16) };
  let generated = 0;
  let accepted = false;
  const app = createApp({
    ...deps,
    generateDraft: async () => {
      generated++;
      return spec;
    },
    post: async (call) => {
      assert.equal(call.body.input.op, "check_spec");
      assert.deepEqual(call.body.input.spec, spec);
      return { ok: true, body: accepted ? { ok: true, spec_hash: "0".repeat(64) } : { ok: false } };
    },
  });

  assert.equal((await app.request(path, post(path, input))).status, 401);
  assert.equal(generated, 0);
  assert.equal((await app.request(path, signed(path, input))).status, 422);
  accepted = true;
  const response = await app.request(path, signed(path, input));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, spec });
});

test("cap-aware drafting rejects an unpaid maximum above the selected cap even if sampled ledgers pass", async () => {
  const { deps } = testDeps();
  const path = "/sponsor/draft";
  const input = { story: "A club.", decimals: 6, cap: "20000000" };
  let unit = "13";
  const app = createApp({
    ...deps,
    generateDraft: async (_story, _decimals, cap) => {
      assert.equal(cap, input.cap);
      return { lines: [{ paid: false, reference: "NG-{d4}", qty: { hi: 2 }, unit: { hi: unit } }] };
    },
    post: async (call) => {
      assert.equal(call.body.input.cap, input.cap);
      return { ok: true, body: { ok: true, pass: true, spec_hash: "0".repeat(64) } };
    },
  });
  assert.equal((await app.request(path, signed(path, input))).status, 422);
  unit = "10";
  assert.equal((await app.request(path, signed(path, input))).status, 200);
});

test("a round with no crack left sells no new raid and signs no new bill", async () => {
  const views = { vaults: { anchor: openRow({ crack_count: 2, max_cracks: 2, round: "1" }), other: openRow({ crack_count: 1, max_cracks: 2, round: "1" }) }, specs: {}, owner: "owner.test", calls: [] };
  const { deps, posts } = testDeps({}, views);
  const app = createApp(deps);
  const guard = (body: unknown) => app.request("/guard", post("/guard", body));
  const full = await guard({ op: "open", vault_id: "anchor", round: 1, player_id: "p" });
  assert.equal(full.status, 409);
  assert.deepEqual(await full.json(), { ok: false, error: "full" });
  assert.equal((await guard({ op: "bill", vault_id: "anchor", round: 1, player_id: "p" })).status, 409);
  assert.equal(posts.length, 0);
  assert.notEqual((await guard({ op: "open", vault_id: "other", round: 1, player_id: "p" })).status, 409);
});

test("recent nights give the door and the result, never a bill, and the weekly board is a query", async () => {
  const { memoryPlayers } = await import("../src/player-record.ts");
  const players = memoryPlayers();
  const claimKey = "ab".repeat(32);
  await players.insert({ publicKey: "ed25519:AAA", claimKey, name: "QuietOwl22", renameUsed: false, streak: 1, lastDay: "2026-11-05", nightsIn: 1, created: "2026-11-05" });
  await players.saveNight({ claimKey, vaultId: "anchor", round: "1", state: "in", day: "2026-11-05" });
  const { deps } = testDeps({ players });
  const app = createApp(deps);
  const recent = await app.request("/player/recent/QuietOwl22", { headers: { origin: ORIGIN } });
  const body = (await recent.json()) as { ok: boolean; nights: { door: string; state: string; day: string }[] };
  assert.equal(body.ok, true);
  assert.deepEqual(body.nights.map((n) => [n.door, n.state, n.day]), [["anchor", "in", "2026-11-05"]]);
  assert.equal(JSON.stringify(body).includes("bill"), false);
  const week = await app.request("/player/board?period=week", { headers: { origin: ORIGIN } });
  assert.equal(((await week.json()) as { ok: boolean }).ok, true);
});

test("a raid opens only for a passkey that is not the door's sponsor or the owner", async () => {
  const relay = "relay.test";
  const sponsorKeys = KeyPair.fromRandom("ed25519");
  const ownerKeys = KeyPair.fromRandom("ed25519");
  const sponsorAccount = (await accountIdForPublicKey(sponsorKeys.getPublicKey().toString(), relay))!;
  const ownerAccount = (await accountIdForPublicKey(ownerKeys.getPublicKey().toString(), relay))!;
  const views = { vaults: { door: openRow({ crack_count: 0, max_cracks: 1, round: "1", sponsor: sponsorAccount }) }, specs: {}, owner: ownerAccount, calls: [] };
  const { deps, posts } = testDeps({}, views);
  const app = createApp(deps);
  const open = (who: ReturnType<typeof playerOpen> | null, playerId?: string) =>
    app.request("/guard", post("/guard", { op: "open", vault_id: "door", round: 1, player_id: playerId ?? who?.claimKey ?? "p", raid_id: "r" }, who ? { "x-player-auth": who.header } : {}));

  // The sponsor's own passkey, and the owner's, are refused before the guard is called.
  const asSponsor = await open(playerOpen("/guard/open", { account: sponsorKeys }));
  assert.equal(asSponsor.status, 403);
  assert.deepEqual(await asSponsor.json(), { ok: false, error: "sponsor" });
  assert.equal((await open(playerOpen("/guard/open", { account: ownerKeys }))).status, 403);
  assert.equal(posts.length, 0);

  // No header, a header for another route, and a header for another claim key are all refused.
  assert.equal((await open(null)).status, 401);
  assert.equal((await open(playerOpen("/player/session"))).status, 401);
  assert.equal((await open(playerOpen("/guard/open"), "f".repeat(64))).status, 401);
  assert.equal(posts.length, 0);

  // Any other passkey opens.
  assert.equal((await open(playerOpen("/guard/open"))).status, 200);
  assert.equal(posts.length, 1);
});

test("a shut, past-close or old round answers no raid, message or bill, so its street hints stay shut", async () => {
  const closed = Date.UTC(2026, 10, 5) * 1_000_000;
  const views = {
    vaults: {
      shut: vaultRow({ open: false }),
      late: openRow({ closes_at: String(BigInt(closed)) }),
      live: openRow({ round: "3" }),
    },
    specs: {},
    owner: "owner.test",
    calls: [],
  };
  const { deps, posts } = testDeps({}, views);
  const app = createApp(deps);
  for (const [vault, round] of [["shut", 1], ["late", 1], ["live", 2]] as const) {
    for (const op of ["open", "say", "bill"]) {
      const who = playerOpen("/guard/open");
      const res = await app.request("/guard", post("/guard", { op, vault_id: vault, round, player_id: who.claimKey, blob: "b" }, { "x-player-auth": who.header }));
      assert.equal(res.status, 409, `${vault} ${op}`);
      assert.deepEqual(await res.json(), { ok: false, error: "closed" });
    }
  }
  assert.equal(posts.length, 0);
  const who = playerOpen("/guard/open");
  assert.equal((await app.request("/guard", post("/guard", { op: "open", vault_id: "live", round: 3, player_id: who.claimKey }, { "x-player-auth": who.header }))).status, 200);
});

test("resume hands back the blob even when progress cannot be read", async () => {
  const { memoryPlayers } = await import("../src/player-record.ts");
  const players = memoryPlayers();
  const who = playerOpen("/player/resume");
  await players.saveBlob(who.claimKey, "anchor", "1", "sealed");
  players.readProgress = async () => {
    throw new Error("no table");
  };
  const { deps } = testDeps({ players });
  const res = await createApp(deps).request("/player/resume", post("/player/resume", { vaultId: "anchor", round: "1" }, { "x-player-auth": who.header }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; blob: string | null; progress: unknown };
  assert.equal(body.ok, true);
  assert.equal(body.blob, "sealed");
});

test("a draft that copies the form's sample payees is not handed back", async () => {
  const { SAMPLE_SPEC } = await import("../../web/lib/sample-spec.ts");
  const { deps } = testDeps();
  const path = "/sponsor/draft";
  const input = { story: "A club.", decimals: 6, cap: "20000000" };
  let checked = 0;
  const app = createApp({
    ...deps,
    generateDraft: async () => ({ lines: [{ paid: false, payee: SAMPLE_SPEC.lines[0].payee, reference: "NG-{d4}", qty: { hi: 1 }, unit: { hi: "5" } }] }),
    post: async () => {
      checked += 1;
      return { ok: true, body: { ok: true, pass: true, spec_hash: "0".repeat(64) } };
    },
  });
  const res = await app.request(path, signed(path, input));
  assert.equal(res.status, 422);
  assert.match(String(((await res.json()) as { detail?: string }).detail), /sample payees/);
  assert.equal(checked, 0);
});

test("a claim key already paired with one account key cannot open a raid under another", async () => {
  const { memoryPlayers } = await import("../src/player-record.ts");
  const { deps } = testDeps({ players: memoryPlayers() });
  const app = createApp(deps);
  const claim = KeyPair.fromRandom("ed25519");
  const first = playerOpen("/guard/open", { claim });
  assert.equal((await app.request("/guard", post("/guard", { op: "open", vault_id: "velvet-1", round: 1, player_id: first.claimKey }, { "x-player-auth": first.header }))).status, 200);
  const swapped = playerOpen("/guard/open", { claim });
  const res = await app.request("/guard", post("/guard", { op: "open", vault_id: "velvet-1", round: 1, player_id: swapped.claimKey }, { "x-player-auth": swapped.header }));
  assert.equal(res.status, 401);
});
