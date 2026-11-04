import assert from "node:assert/strict";
import test from "node:test";
import type { Rpc } from "./chain.ts";
import { readPageVault, type PageEnv } from "./page-vault.ts";

const env: PageEnv = { contractId: "vault.test", defaultVaultId: "velvet-1", currency: "tUSDC", decimals: 6, venue: "velvet" };
const key = Array.from({ length: 32 }, (_, i) => i);
const row = (over: Record<string, unknown> = {}) => ({
  sponsor: "s.test", pot: "1", day_pot: "0", reserved: "0", cap: "1", lock_ns: "1", rule: "PayTheBill", guard_pk: key, commitment: null,
  guard_version: null, round: "1", opens_at: "0", closes_at: "0", open: false, challenge_end: null, max_cracks: 1, ticketed: false,
  closed_pending_bump: false, refund_in_flight: "0", crack_count: 0, ...over,
});
const card = JSON.stringify({ v: 1, sign: "THE ANCHOR", name: "Ama", pitch: "We owe.", look: {} });

function rpcFor(table: Record<string, unknown>): Rpc {
  return async (request) => {
    const p = request.params as { method_name: string; args_base64: string; account_id: string };
    const args = JSON.parse(Buffer.from(p.args_base64, "base64").toString("utf8")) as Record<string, unknown>;
    const k = p.method_name === "get_vault" ? `get_vault:${args.vault_id}` : p.method_name === "get_spec" ? `get_spec:${args.vault_id}` : p.method_name;
    return k in table ? { ok: true, value: table[k] } : { ok: false, error: "rpc" };
  };
}

test("the default vault is read with the labels from env", async () => {
  const out = await readPageVault(rpcFor({ "get_vault:velvet-1": row(), get_owner: "owner.test" }), env);
  assert.ok(out.ok);
  if (out.ok) {
    assert.equal(out.page.venueId, "velvet");
    assert.equal(out.page.currency, "tUSDC");
    assert.equal(out.page.card, null);
    assert.equal(out.page.specCt, null);
  }
});

test("a sponsor vault is read with its card, its sealed story, and its own token labels", async () => {
  const out = await readPageVault(
    rpcFor({
      "get_vault:anchor": row({ spec_hash: key, card }), "get_spec:anchor": "AQID", get_owner: "owner.test",
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
    assert.deepEqual([out.page.currency, out.page.decimals], ["USDC", 8]);
  }
});

test("a card that does not parse still loads the door with no card", async () => {
  const out = await readPageVault(
    rpcFor({ "get_vault:anchor": row({ spec_hash: key, card: "nope" }), "get_spec:anchor": "AQID", get_owner: "o", get_usdc_account: "u", ft_metadata: { symbol: "U", decimals: 6 } }),
    env,
    "anchor",
  );
  assert.ok(out.ok && out.page.card === null);
});

test("every failed read is an error and nothing is filled in", async () => {
  const base = { get_owner: "o", get_usdc_account: "u", ft_metadata: { symbol: "U", decimals: 6 } };
  assert.equal((await readPageVault(rpcFor({ ...base }), env, "ghost")).ok, false);
  assert.deepEqual(await readPageVault(rpcFor({ ...base, "get_vault:ghost": null }), env, "ghost"), { ok: false, error: "missing vault" });
  assert.deepEqual(await readPageVault(rpcFor({ ...base, "get_vault:plain": row() }), env, "plain"), { ok: false, error: "no story" });
  assert.deepEqual(await readPageVault(rpcFor({ ...base, "get_vault:anchor": row({ spec_hash: key }) }), env, "anchor"), { ok: false, error: "spec" });
  const noToken = { "get_vault:anchor": row({ spec_hash: key, card }), "get_spec:anchor": "AQID", get_owner: "o" };
  assert.deepEqual(await readPageVault(rpcFor(noToken), env, "anchor"), { ok: false, error: "token" });
  assert.deepEqual(await readPageVault(rpcFor(base), env, "bad id!"), { ok: false, error: "id" });
});

test("sponsor token reads start without waiting for the sealed spec", async () => {
  const calls: string[] = [];
  let releaseSpec!: () => void;
  let tokenStarted!: () => void;
  const started = new Promise<void>((resolve) => { tokenStarted = resolve; });
  const spec = new Promise<void>((resolve) => { releaseSpec = resolve; });
  const rpc: Rpc = async (request) => {
    const method = (request.params as { method_name: string }).method_name;
    calls.push(method);
    if (method === "get_vault") return { ok: true, value: row({ spec_hash: key, card }) };
    if (method === "get_owner") return { ok: true, value: "owner.testnet" };
    if (method === "get_spec") { await spec; return { ok: true, value: "AQID" }; }
    if (method === "get_usdc_account") { tokenStarted(); return { ok: true, value: "usdc.testnet" }; }
    return { ok: true, value: { symbol: "USDC", decimals: 6 } };
  };
  const reading = readPageVault(rpc, env, "anchor");
  await started;
  assert.ok(calls.includes("get_spec"));
  releaseSpec();
  const result = await reading;
  assert.ok(result.ok && result.page.specCt === "010203");
});
