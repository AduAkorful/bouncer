import assert from "node:assert/strict";
import test from "node:test";
import { KeyPair } from "near-api-js";
import { createApp } from "../src/app.ts";
import { authHeader, openRow, playerOpen, testDeps } from "./testkit.ts";

const ORIGIN = "https://site.test";
const post = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
  body: JSON.stringify(body),
});
const NOW = Math.floor(Date.UTC(2026, 10, 5, 12, 0, 0) / 1000);
const draft = { story: "A club.", decimals: 6 };
const signedPost = (route: string, body: unknown, over: Parameters<typeof authHeader>[1] = {}) => post(body, { "x-sponsor-auth": authHeader(route, over) });
const bill = (vault: string, round: number, ip = "1.1.1.1") => {
  const who = playerOpen("/guard/bill");
  return post({ op: "bill", vault_id: vault, round, player_id: who.claimKey, blob: "b" }, { "x-forwarded-for": ip, "x-player-auth": who.header });
};

const openDoors = () => ({ vaults: { anchor: openRow(), "velvet-1": openRow() }, specs: {}, owner: "owner.test", calls: [] });

test("a vault takes only so many bills in a round, per vault and per round", async () => {
  const { deps, posts } = testDeps({}, openDoors());
  const app = createApp(deps);
  for (let i = 0; i < 5; i += 1) assert.equal((await app.request("/guard", bill("anchor", 1, `9.9.9.${i}`))).status, 200, String(i));
  const refused = await app.request("/guard", bill("anchor", 1, "9.9.9.9"));
  assert.equal(refused.status, 429);
  assert.deepEqual(await refused.json(), { ok: false, error: "The door is busy. Try again tomorrow." });
  assert.equal(posts.length, 5);
  assert.equal((await app.request("/guard", bill("velvet-1", 1))).status, 200);
});

test("a refused bill spends nothing at the guard, and only bills are counted", async () => {
  const { deps, posts } = testDeps({}, openDoors());
  const app = createApp(deps);
  for (let i = 0; i < 5; i += 1) await app.request("/guard", bill("anchor", 1, `8.8.8.${i}`));
  const before = posts.length;
  await app.request("/guard", bill("anchor", 1, "7.7.7.7"));
  assert.equal(posts.length, before);
  for (let i = 0; i < 10; i += 1) {
    const who = playerOpen("/guard/say");
    const said = await app.request("/guard", post({ op: "say", vault_id: "anchor", round: 1, player_id: who.claimKey, blob: "b" }, { "x-forwarded-for": `6.6.6.${i}`, "x-player-auth": who.header }));
    assert.notEqual(said.status, 429);
  }
});

test("an unsigned message or bill reaches no guard and counts no bill", async () => {
  const { deps, posts } = testDeps({}, openDoors());
  const app = createApp(deps);
  for (const op of ["say", "bill"]) {
    assert.equal((await app.request("/guard", post({ op, vault_id: "anchor", round: 1, player_id: "0".repeat(64), blob: "00" }))).status, 401, op);
    // Signed for another route, or by another claim key than the one named, is refused the same way.
    const other = playerOpen("/guard/open");
    assert.equal((await app.request("/guard", post({ op, vault_id: "anchor", round: 1, player_id: other.claimKey, blob: "00" }, { "x-player-auth": other.header }))).status, 401, op);
    const stranger = playerOpen(`/guard/${op}`);
    assert.equal((await app.request("/guard", post({ op, vault_id: "anchor", round: 1, player_id: "0".repeat(64), blob: "00" }, { "x-player-auth": stranger.header }))).status, 401, op);
  }
  assert.equal(posts.length, 0);
  assert.deepEqual(deps.bills.snapshot(), {});
});

test("a bill for a round that is not open is refused before it is counted", async () => {
  const { deps, posts } = testDeps({}, openDoors());
  const app = createApp(deps);
  assert.equal((await app.request("/guard", bill("anchor", 2))).status, 409);
  assert.equal(posts.length, 0);
  assert.deepEqual(deps.bills.snapshot(), {});
});

test("new identities are limited per address and not for other addresses", async () => {
  const { deps } = testDeps();
  const app = createApp(deps);
  const open = (n: number, ip: string) => app.request("/guard", post({ op: "open", vault_id: "anchor", round: 1, player_id: `p${n}`, raid_id: "r" }, { "x-forwarded-for": ip }));
  let status = 200;
  for (let i = 0; i < 31; i += 1) status = (await open(i, "4.4.4.4")).status;
  assert.equal(status, 429);
  assert.notEqual((await open(99, "5.5.5.5")).status, 429);
});

test("a sponsor route with no signature, or a bad one, is refused and nothing reaches the guard", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  assert.equal((await app.request("/sponsor/draft", post(draft))).status, 401);
  assert.equal((await app.request("/sponsor/draft", post(draft, { "x-sponsor-auth": "garbage" }))).status, 401);
  const other = KeyPair.fromRandom("ed25519");
  // Signed by another key than the one the chain lists for the account.
  const wrongKey = authHeader("/sponsor/draft", { key: other });
  const swapped = wrongKey.replace(other.getPublicKey().toString(), authHeader("/sponsor/draft").split("|")[1]);
  assert.equal((await app.request("/sponsor/draft", post(draft, { "x-sponsor-auth": swapped }))).status, 401);
  assert.equal((await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { signRoute: "/sponsor/seal" }))).status, 401);
  assert.equal((await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { seconds: NOW - 121 }))).status, 401);
  assert.equal((await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { seconds: NOW + 121 }))).status, 401);
  assert.equal(posts.length, 0);
  assert.equal((await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft))).status, 200);
});

test("a repeated challenge is refused", async () => {
  const { deps } = testDeps();
  const app = createApp(deps);
  const header = authHeader("/sponsor/draft");
  assert.equal((await app.request("/sponsor/draft", post(draft, { "x-sponsor-auth": header }))).status, 200);
  assert.equal((await app.request("/sponsor/draft", post(draft, { "x-sponsor-auth": header }))).status, 401);
});

test("a key that is not full access on the account, or that the chain cannot place, is refused", async () => {
  for (const answer of [false, null]) {
    const { deps, posts } = testDeps({ accessKeyIsFull: async () => answer });
    const res = await createApp(deps).request("/sponsor/draft", signedPost("/sponsor/draft", draft));
    assert.equal(res.status, 401);
    assert.equal(posts.length, 0);
  }
});

test("quotas are per account, and one account cannot use up another's", async () => {
  const { deps } = testDeps({}, undefined);
  deps.budget = { take: () => true, used: () => 0 };
  const app = createApp(deps);
  let last = 200;
  for (let i = 0; i < 11; i += 1) last = (await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { account: "ama.test" }))).status;
  assert.equal(last, 429);
  const other = await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { account: "kofi.test" }));
  assert.equal(other.status, 200);
  const tests = await app.request("/sponsor/check", signedPost("/sponsor/check", { spec: { v: 1 }, cap: "5" }, { account: "ama.test" }));
  assert.equal(tests.status, 200);
});

test("the global budget still caps every sponsor together", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  for (let i = 0; i < 3; i += 1) assert.equal((await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { account: `a${i}.test` }))).status, 200);
  assert.equal((await app.request("/sponsor/draft", signedPost("/sponsor/draft", draft, { account: "z.test" }))).status, 429);
  assert.equal(posts.length, 3);
});

test("seal passes the cap and the hint acknowledgment on, and needs a cap", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  const route = "/sponsor/seal";
  assert.equal((await app.request(route, signedPost(route, { vault_id: "anchor", spec: { v: 1 } }))).status, 400);
  assert.equal((await app.request(route, signedPost(route, { vault_id: "anchor", spec: { v: 1 }, cap: "20000000", ack_hint: true }))).status, 200);
  assert.equal((await app.request(route, signedPost(route, { vault_id: "anchor", spec: { v: 1 }, cap: "20000000", ack_hint: "yes" }))).status, 200);
  assert.equal(posts[0].input.cap, "20000000");
  assert.equal(posts[0].input.ack_hint, true);
  assert.equal(posts[1].input.ack_hint, false);
});

test("commit is signed and counted too", async () => {
  const { deps, posts } = testDeps();
  const app = createApp(deps);
  assert.equal((await app.request("/sponsor/commit", post({ vault_id: "anchor" }))).status, 401);
  assert.equal(posts.length, 0);
  assert.equal((await app.request("/sponsor/commit", signedPost("/sponsor/commit", { vault_id: "anchor" }))).status, 200);
});

test("/status shows the bill counters and no secret", async () => {
  const { deps } = testDeps({}, openDoors());
  const app = createApp(deps);
  await app.request("/guard", bill("anchor", 1));
  const text = await (await app.request("/status")).text();
  assert.ok(text.includes("anchor|1"));
  for (const secret of ["payment-key-secret", "relay-private-key-secret", "keeper-private-key-secret"]) assert.equal(text.includes(secret), false);
});
