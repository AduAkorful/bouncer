import assert from "node:assert/strict";
import test from "node:test";
import { readServerEnv } from "./env.ts";
import { createGuardPost, sponsorCall } from "./guard-client.ts";
import { createBudget, createLimiter } from "./limits.ts";
import { testEnv } from "./testkit.ts";

const full = {
  NEAR_RPC_URL: "https://rpc.test", NEAR_NETWORK_ID: "testnet", VAULT_CONTRACT_ID: "vault.test", VAULT_ID: "velvet-1",
  RELAY_ACCOUNT_ID: "relay.test", RELAY_PRIVATE_KEY: "k", OUTLAYER_CALL_URL: "https://o.test/call/a/b", OUTLAYER_PAYMENT_KEY: "p",
  OUTLAYER_VERSION_KEY: "ab".repeat(32), OUTLAYER_MAX_EXECUTION_SECONDS: "120", OUTLAYER_MAX_MEMORY_MB: "128",
  AUTH_CONTRACT_ID: "auth.test", SITE_ORIGIN: "https://site.test", SPONSOR_DAILY_CALLS: "100",
};

test("the server env names what is missing and starts without a keeper", () => {
  const ok = readServerEnv(full);
  assert.ok(ok.ok);
  if (ok.ok) assert.equal(ok.env.keeper, null);
  const bad = readServerEnv({});
  assert.ok(!bad.ok);
  if (!bad.ok) assert.ok(bad.missing.includes("OUTLAYER_PAYMENT_KEY") && bad.missing.includes("SITE_ORIGIN"));
  const half = readServerEnv({ ...full, KEEPER_ACCOUNT_ID: "k.test" });
  assert.ok(!half.ok && half.missing.includes("KEEPER_PRIVATE_KEY"));
  assert.ok(!readServerEnv({ ...full, SITE_ORIGIN: "https://site.test/path" }).ok);
  assert.ok(!readServerEnv({ ...full, SPONSOR_DAILY_CALLS: "0" }).ok);
  const keeper = readServerEnv({ ...full, KEEPER_ACCOUNT_ID: "k.test", KEEPER_PRIVATE_KEY: "ed25519:x" });
  assert.ok(keeper.ok && keeper.env.keeper?.accountId === "k.test");
});

test("a window counts, then resets", () => {
  let t = 0;
  const limiter = createLimiter(() => t);
  assert.ok(limiter.take("a", 2, 1000) && limiter.take("a", 2, 1000));
  assert.equal(limiter.take("a", 2, 1000), false);
  assert.ok(limiter.take("b", 2, 1000));
  t = 1001;
  assert.ok(limiter.take("a", 2, 1000));
});

test("the daily budget resets at midnight UTC", () => {
  let t = Date.UTC(2026, 10, 5, 23, 0, 0);
  const budget = createBudget(() => t, 2);
  assert.ok(budget.take() && budget.take());
  assert.equal(budget.take(), false);
  assert.equal(budget.used(), 2);
  t = Date.UTC(2026, 10, 6, 0, 0, 1);
  assert.ok(budget.take());
});

const call = sponsorCall(testEnv().guard, "commit", { vault_id: "a" });
const reply = (status: number, body: unknown = { status: "completed", output: { ok: true } }) => new Response(JSON.stringify(body), { status });

test("one retry on a network error or a 5xx, none on a 4xx", async () => {
  let n = 0;
  const flaky = createGuardPost((async () => (++n === 1 ? Promise.reject(new Error("net")) : reply(200))) as typeof fetch);
  assert.deepEqual(await flaky(call), { ok: true, body: { ok: true } });
  assert.equal(n, 2);
  n = 0;
  const five = createGuardPost((async () => (++n === 1 ? reply(502) : reply(200))) as typeof fetch);
  assert.equal((await five(call)).ok, true);
  n = 0;
  const four = createGuardPost((async () => (++n, reply(400))) as typeof fetch);
  assert.equal((await four(call)).ok, false);
  assert.equal(n, 1);
  n = 0;
  const dead = createGuardPost((async () => (++n, Promise.reject(new Error("net")))) as typeof fetch);
  assert.equal((await dead(call)).ok, false);
  assert.equal(n, 2);
});

test("the retry sends the same body", async () => {
  const bodies: string[] = [];
  const post = createGuardPost((async (_url: unknown, init: RequestInit) => {
    bodies.push(String(init.body));
    return bodies.length === 1 ? reply(503) : reply(200);
  }) as typeof fetch);
  await post(call);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
});

test("a sponsor call carries its op and the payment key only in the header", () => {
  const c = sponsorCall(testEnv().guard, "seal_spec", { vault_id: "a", spec: {} });
  assert.equal(c.body.input.op, "seal_spec");
  assert.equal(JSON.stringify(c.body).includes("payment-key-secret"), false);
  assert.equal(c.headers["x-payment-key"], "payment-key-secret");
});
