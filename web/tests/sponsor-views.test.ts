import assert from "node:assert/strict";
import test from "node:test";
import { byteCostFromConfig, createBytes, depositFor, specBytes } from "../lib/storage-cost.ts";
import { parseBalance, parseLimits, parseSpecCt, parseTokenMeta, parseVaultList } from "../lib/sponsor-views.ts";
import { fromBaseUnits, toBaseUnits } from "../lib/token.ts";

const key = Array.from({ length: 32 }, (_, i) => i);
const limits = {
  self_serve: true, max_cap: "5000000", max_cracks: 4, min_lock_ns: "60000000000", max_lock_ns: "86400000000000",
  max_open_lead_ns: "86400000000000", max_spec_ct: 8300, max_card: 600, default_guard_pk: key, reserved_prefixes: ["velvet"],
};

test("limits parse and a missing field fails", () => {
  const ok = parseLimits(limits);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.selfServe, true);
    assert.equal(ok.value.maxCard, 600);
    assert.equal(ok.value.defaultGuardPk?.length, 64);
  }
  for (const drop of Object.keys(limits)) {
    const broken: Record<string, unknown> = { ...limits };
    delete broken[drop];
    assert.equal(parseLimits(broken).ok, false, drop);
  }
  assert.equal(parseLimits(null).ok, false);
  assert.equal(parseLimits({ ...limits, default_guard_pk: [1] }).ok, false);
});

test("a sealed spec comes back as hex and a bad string is refused", () => {
  assert.deepEqual(parseSpecCt(null), { ok: true, value: null });
  assert.deepEqual(parseSpecCt("AQID"), { ok: true, value: "010203" });
  assert.equal(parseSpecCt("not base64!").ok, false);
  assert.equal(parseSpecCt(5).ok, false);
});

test("lists, token metadata, and balances fail closed", () => {
  assert.deepEqual(parseVaultList(["a", "b"]), { ok: true, value: ["a", "b"] });
  assert.equal(parseVaultList(["a", 1]).ok, false);
  assert.deepEqual(parseTokenMeta({ symbol: "USDC", decimals: 6, name: "x" }), { ok: true, value: { symbol: "USDC", decimals: 6 } });
  assert.equal(parseTokenMeta({ symbol: "USDC" }).ok, false);
  assert.equal(parseTokenMeta({ symbol: "", decimals: 6 }).ok, false);
  assert.deepEqual(parseBalance("12000000"), { ok: true, value: "12000000" });
  assert.equal(parseBalance("1.5").ok, false);
  assert.equal(parseBalance(null).ok, false);
});

test("amounts convert with the token's own decimals", () => {
  assert.equal(toBaseUnits("20", 6), 20_000_000n);
  assert.equal(toBaseUnits("0.5", 6), 500_000n);
  assert.equal(toBaseUnits("1.1234567", 6), null);
  assert.equal(toBaseUnits("-1", 6), null);
  assert.equal(toBaseUnits("1", 8), 100_000_000n);
  assert.equal(fromBaseUnits(20_000_000n, 6), "20");
  assert.equal(fromBaseUnits(500_000n, 6), "0.5");
  assert.equal(fromBaseUnits(7n, 0), "7");
});

test("the byte cost is read from the network and never assumed", () => {
  const good = { result: { runtime_config: { storage_amount_per_byte: "10000000000000000000" } } };
  assert.deepEqual(byteCostFromConfig(good), { ok: true, yoctoPerByte: 10_000_000_000_000_000_000n });
  assert.equal(byteCostFromConfig({}).ok, false);
  assert.equal(byteCostFromConfig({ result: { runtime_config: { storage_amount_per_byte: "0" } } }).ok, false);
  assert.equal(byteCostFromConfig(null).ok, false);
});

test("a deposit covers the bytes with a margin", () => {
  const cost = 10_000_000_000_000_000_000n;
  const deposit = depositFor(specBytes(4000, "card", "anchor"), cost);
  assert.ok(deposit > BigInt(4000) * cost);
  assert.ok(deposit < BigInt(6000) * cost);
  assert.ok(depositFor(createBytes("anchor"), cost) > 0n);
  assert.throws(() => depositFor(-1, cost));
  assert.throws(() => depositFor(1, 0n));
});
