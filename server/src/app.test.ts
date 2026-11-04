import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./app.ts";
import { authHeader, SECRETS, testDeps, vaultRow } from "./testkit.ts";

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
  const open = await app.request("/guard", post("/guard", { op: "open", vault_id: "velvet-1", round: 1, player_id: "p1", raid_id: "r1" }));
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

test("/verdict refuses a relay that owns the vault", async () => {
  const { deps } = testDeps({}, { vaults: { anchor: vaultRow() }, specs: {}, owner: "relay.test", calls: [] });
  const res = await createApp(deps).request("/verdict", post("/verdict", verdict("anchor")));
  assert.equal(res.status, 409);
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

test("account creation and signing are limited per address", async () => {
  const app = createApp(testDeps().deps);
  let last = 200;
  for (let i = 0; i < 6; i += 1) last = (await app.request("/passkey/create-account", post("/x", { publicKey: "ed25519:abc" }))).status;
  assert.equal(last, 429);
  assert.equal((await app.request("/passkey/sign-tx", post("/x", { guard_id: "g" }, { "x-forwarded-for": "9.9.9.9" }))).status, 200);
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
