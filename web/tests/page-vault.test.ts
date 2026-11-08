import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { Rpc } from "../lib/chain.ts";
import { forgetTokenLabel, readPageVault, TOKEN_LABEL_MS, type PageEnv } from "../lib/page-vault.ts";

const env: PageEnv = { contractId: "vault.test" };
const key = Array.from({ length: 32 }, (_, i) => i);
const row = (over: Record<string, unknown> = {}) => ({
  sponsor: "s.test", pot: "1", day_pot: "0", reserved: "0", cap: "1", lock_ns: "1", rule: "PayTheBill", guard_pk: key, commitment: null,
  guard_version: null, round: "1", opens_at: "0", closes_at: "0", open: false, challenge_end: null, max_cracks: 1, ticketed: false,
  closed_pending_bump: false, refund_in_flight: "0", crack_count: 0, ...over,
});
const card = JSON.stringify({ v: 1, sign: "THE ANCHOR", name: "Ama", pitch: "We owe.", look: {} });

function rpcFor(table: Record<string, unknown>, seen: string[] = []): Rpc {
  return async (request) => {
    const p = request.params as { method_name: string; args_base64: string; account_id: string };
    const args = JSON.parse(Buffer.from(p.args_base64, "base64").toString("utf8")) as Record<string, unknown>;
    const k = p.method_name === "get_vault" ? `get_vault:${args.vault_id}` : p.method_name === "get_spec" ? `get_spec:${args.vault_id}` : p.method_name;
    seen.push(k);
    return k in table ? { ok: true, value: table[k] } : { ok: false, error: "rpc" };
  };
}

test.beforeEach(() => {
  forgetTokenLabel();
});

test("a vault with no sealed story loads without get_owner and uses the token symbol", async () => {
  const seen: string[] = [];
  const out = await readPageVault(rpcFor({
    "get_vault:velvet-1": row(),
    get_usdc_account: "usdc.test", ft_metadata: { symbol: "USDC", decimals: 6 },
  }, seen), env, "velvet-1");
  assert.ok(out.ok);
  if (out.ok) {
    assert.equal(out.page.venueId, "velvet-1");
    assert.equal(out.page.card, null);
    assert.equal(out.page.specCt, null);
    assert.equal("owner" in out.page, false);
    assert.deepEqual(await out.page.token, { ok: true, symbol: "USDC", decimals: 6 });
  }
  assert.equal(seen.includes("get_owner"), false);
});

test("a failed token leaves the vault and omits the symbol", async () => {
  const out = await readPageVault(rpcFor({ "get_vault:velvet-1": row() }), env, "velvet-1");
  assert.ok(out.ok);
  if (out.ok) {
    assert.equal(out.page.vault.round, "1");
    assert.deepEqual(await out.page.token, { ok: false });
    assert.equal("currency" in out.page, false);
  }
});

test("a sponsor vault is read with its card, its sealed story, and its own token labels", async () => {
  const out = await readPageVault(
    rpcFor({
      "get_vault:anchor": row({ spec_hash: key, card }), "get_spec:anchor": "AQID",
      get_usdc_account: "usdc.test", ft_metadata: { symbol: "USDC", decimals: 8 },
    }),
    env,
    "anchor",
  );
  assert.ok(out.ok);
  if (out.ok) {
    assert.equal(out.page.venueId, "custom");
    assert.equal(out.page.card?.sign, "THE ANCHOR");
    assert.equal(out.page.specCt, "010203");
    assert.deepEqual(await out.page.token, { ok: true, symbol: "USDC", decimals: 8 });
  }
});

test("a card that does not parse still loads the door with no card", async () => {
  const out = await readPageVault(
    rpcFor({ "get_vault:anchor": row({ spec_hash: key, card: "nope" }), "get_spec:anchor": "AQID", get_usdc_account: "u", ft_metadata: { symbol: "U", decimals: 6 } }),
    env,
    "anchor",
  );
  assert.ok(out.ok && out.page.card === null);
});

test("a missing vault and a failed spec stay errors, and a vault with no story still loads", async () => {
  const base = { get_usdc_account: "u", ft_metadata: { symbol: "U", decimals: 6 } };
  assert.equal((await readPageVault(rpcFor({ ...base }), env, "ghost")).ok, false);
  assert.deepEqual(await readPageVault(rpcFor({ ...base, "get_vault:ghost": null }), env, "ghost"), { ok: false, error: "missing vault" });
  const plain = await readPageVault(rpcFor({ ...base, "get_vault:plain": row() }), env, "plain");
  assert.ok(plain.ok);
  if (plain.ok) {
    assert.equal(plain.page.card, null);
    assert.equal(plain.page.specCt, null);
    assert.equal(plain.page.venueId, "plain");
  }
  assert.deepEqual(await readPageVault(rpcFor({ ...base, "get_vault:anchor": row({ spec_hash: key }) }), env, "anchor"), { ok: false, error: "spec" });
  assert.deepEqual(await readPageVault(rpcFor(base), env, "bad id!"), { ok: false, error: "id" });
});

test("the token account starts with the vault, and the door does not wait for it", async () => {
  let releaseVault!: () => void;
  const vaultHeld = new Promise<void>((resolve) => { releaseVault = resolve; });
  let accountDuringVault = false;
  let releaseSpec!: () => void;
  const specHeld = new Promise<void>((resolve) => { releaseSpec = resolve; });
  let releaseMeta!: () => void;
  const metaHeld = new Promise<void>((resolve) => { releaseMeta = resolve; });
  let metadataDuringSpec = false;
  const rpc: Rpc = async (request) => {
    const method = (request.params as { method_name: string }).method_name;
    if (method === "get_owner") throw new Error("owner");
    if (method === "get_vault") {
      await vaultHeld;
      return { ok: true, value: row({ spec_hash: key, card }) };
    }
    if (method === "get_usdc_account") {
      accountDuringVault = true;
      return { ok: true, value: "usdc.testnet" };
    }
    if (method === "get_spec") {
      await specHeld;
      return { ok: true, value: "AQID" };
    }
    metadataDuringSpec = true;
    await metaHeld;
    return { ok: true, value: { symbol: "USDC", decimals: 6 } };
  };
  const reading = readPageVault(rpc, env, "anchor");
  await Promise.resolve();
  assert.equal(accountDuringVault, true);
  releaseVault();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(metadataDuringSpec, true);
  releaseSpec();
  const result = await reading;
  assert.ok(result.ok && result.page.specCt === "010203");
  let settled = false;
  void result.page.token.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  releaseMeta();
  assert.deepEqual(await result.page.token, { ok: true, symbol: "USDC", decimals: 6 });
});

test("a token label is kept for ten minutes, and a failed read is not", async () => {
  let calls = 0;
  const table = {
    "get_vault:velvet-1": row(),
    get_usdc_account: "usdc.test",
    ft_metadata: { symbol: "USDC", decimals: 6 },
  };
  const counting = (): Rpc => async (request) => {
    const method = (request.params as { method_name: string }).method_name;
    if (method === "get_usdc_account" || method === "ft_metadata") calls += 1;
    return rpcFor(table)(request);
  };
  const first = await readPageVault(counting(), env, "velvet-1");
  assert.ok(first.ok);
  if (first.ok) await first.page.token;
  assert.equal(calls, 2);
  const second = await readPageVault(counting(), env, "velvet-1");
  assert.ok(second.ok);
  if (second.ok) assert.deepEqual(await second.page.token, { ok: true, symbol: "USDC", decimals: 6 });
  assert.equal(calls, 2);

  forgetTokenLabel();
  calls = 0;
  const missed = await readPageVault(rpcFor({ "get_vault:velvet-1": row() }), env, "velvet-1");
  assert.ok(missed.ok);
  if (missed.ok) assert.deepEqual(await missed.page.token, { ok: false });
  const again = await readPageVault(counting(), env, "velvet-1");
  assert.ok(again.ok);
  if (again.ok) await again.page.token;
  assert.equal(calls, 2);

  const start = Date.now();
  mock.timers.enable({ apis: ["Date"], now: start });
  try {
    mock.timers.tick(TOKEN_LABEL_MS + 1);
    const expired = await readPageVault(counting(), env, "velvet-1");
    assert.ok(expired.ok);
    if (expired.ok) await expired.page.token;
    assert.equal(calls, 4);
  } finally {
    mock.timers.reset();
  }
});

test("two vault reads share one token request", async () => {
  let accounts = 0;
  let releaseMeta!: () => void;
  const metaHeld = new Promise<void>((resolve) => { releaseMeta = resolve; });
  const rpc: Rpc = async (request) => {
    const method = (request.params as { method_name: string }).method_name;
    if (method === "get_vault") return { ok: true, value: row() };
    if (method === "get_usdc_account") {
      accounts += 1;
      return { ok: true, value: "usdc.test" };
    }
    await metaHeld;
    return { ok: true, value: { symbol: "USDC", decimals: 6 } };
  };
  const first = readPageVault(rpc, env, "velvet-1");
  const second = readPageVault(rpc, env, "velvet-1");
  const [a, b] = await Promise.all([first, second]);
  assert.equal(accounts, 1);
  releaseMeta();
  assert.ok(a.ok && b.ok);
  if (a.ok && b.ok) {
    assert.deepEqual(await a.page.token, { ok: true, symbol: "USDC", decimals: 6 });
    assert.deepEqual(await b.page.token, await a.page.token);
  }
});
