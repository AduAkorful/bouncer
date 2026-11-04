import assert from "node:assert/strict";
import test from "node:test";
import { commitRound, createSponsorVault, fund, reclaim, setCap, setKeeper, setLock, setSpec } from "./vault-calls.ts";
import { GAS_RESERVE_YOCTO, preflightCommit, preflightCreate, preflightFund, preflightKeeper, preflightReclaim, preflightSetSpec } from "./preflight.ts";
import { notOpenTonight, sponsorStep } from "./sponsor-state.ts";
import type { LimitsView } from "./sponsor-views.ts";
import type { VaultView } from "./vault.ts";

const limits: LimitsView = {
  selfServe: true, maxCap: "5000000", maxCracks: 4, minLockNs: "60000000000", maxLockNs: "86400000000000",
  maxOpenLeadNs: "86400000000000", maxSpecCt: 8300, maxCard: 600, defaultGuardPk: "ab".repeat(32), reservedPrefixes: ["velvet"],
};

function vault(over: Partial<VaultView> = {}): VaultView {
  return {
    sponsor: "sponsor.testnet", pot: "10000000", dayPot: "0", reserved: "0", cap: "1000000", lockNs: "60000000000", rule: "PayTheBill",
    guardPk: "ab".repeat(32), commitment: null, guardVersion: null, round: "1", opensAt: "0", closesAt: "0", open: false, challengeEnd: null,
    maxCracks: 2, ticketed: false, closedPendingBump: false, refundInFlight: "0", crackCount: 0, keeper: null, specHash: "cd".repeat(32),
    card: "{}", specLocked: false, suspended: false, ...over,
  };
}

const rich = { nearYocto: 5n * 10n ** 24n, tokenUnits: 50_000_000n };
const create = { limits, vaultId: "anchor", cap: 1_000_000n, lockNs: 60_000_000_000n, maxCracks: 2, exists: false, depositYocto: 10n ** 23n, funds: rich };

test("call builders send the vault's own argument shapes", () => {
  const c = createSponsorVault("vault.testnet", { vaultId: "anchor", rule: "PayTheBill", cap: 1_000_000n, lockNs: 60_000_000_000n, maxCracks: 2 }, 10n ** 23n);
  assert.ok(c.ok);
  if (c.ok) {
    assert.deepEqual(c.call.args, { vault_id: "anchor", rule: "PayTheBill", cap: 1_000_000, lock_ns: 60_000_000_000, max_cracks: 2 });
    assert.equal(c.call.method, "create_sponsor_vault");
  }
  const s = setSpec("vault.testnet", { vaultId: "anchor", specCtHex: "010203", specHashHex: "ab".repeat(32), card: "x" }, 1n);
  assert.ok(s.ok);
  if (s.ok) {
    assert.equal(s.call.args.spec_ct, "AQID");
    assert.deepEqual((s.call.args.spec_hash as number[]).length, 32);
  }
  const r = commitRound("vault.testnet", { vaultId: "anchor", commitmentHex: "11".repeat(32), guardVersionHex: "22".repeat(32), opensAtNs: 1_793_807_668_041_080_320n, signatureHex: "33".repeat(64) });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal((r.call.args.guard_signature as number[]).length, 64);
    assert.equal(typeof r.call.args.opens_at, "number");
  }
  const f = fund("token.testnet", "vault.testnet", "anchor", 20_000_000n);
  assert.ok(f.ok);
  if (f.ok) {
    assert.deepEqual(f.call.args, { receiver_id: "vault.testnet", amount: "20000000", msg: "anchor" });
    assert.equal(f.call.depositYocto, 1n);
  }
  const k = setKeeper("vault.testnet", "anchor", null);
  assert.ok(k.ok && k.call.args.keeper === null);
  assert.ok(reclaim("v", "a").ok && setCap("v", "a", 5n).ok && setLock("v", "a", 60_000_000_000n).ok);
});

test("a call builder with a missing or bad value builds nothing", () => {
  assert.equal(createSponsorVault("", { vaultId: "a", rule: "PayTheBill", cap: 1n, lockNs: 1n, maxCracks: 1 }, 1n).ok, false);
  assert.equal(createSponsorVault("v", { vaultId: "a", rule: "PayTheBill", cap: 2n ** 60n, lockNs: 1n, maxCracks: 1 }, 1n).ok, false);
  assert.equal(createSponsorVault("v", { vaultId: "a", rule: "PayTheBill", cap: 1n, lockNs: 1n, maxCracks: 0 }, 1n).ok, false);
  assert.equal(setSpec("v", { vaultId: "a", specCtHex: "zz", specHashHex: "ab".repeat(32), card: "x" }, 1n).ok, false);
  assert.equal(setSpec("v", { vaultId: "a", specCtHex: "01", specHashHex: "ab", card: "x" }, 1n).ok, false);
  assert.equal(commitRound("v", { vaultId: "a", commitmentHex: "11".repeat(32), guardVersionHex: "22".repeat(32), opensAtNs: 1n, signatureHex: "33" }).ok, false);
  assert.equal(fund("", "v", "a", 1n).ok, false);
  assert.equal(fund("t", "v", "a", 0n).ok, false);
});

test("create is refused for every reason the contract refuses it", () => {
  assert.equal(preflightCreate(create).ok, true);
  const refused = (over: object) => preflightCreate({ ...create, ...over }).ok === false;
  assert.ok(refused({ limits: { ...limits, selfServe: false } }));
  assert.ok(refused({ limits: { ...limits, defaultGuardPk: null } }));
  assert.ok(refused({ vaultId: "bad id!" }));
  assert.ok(refused({ vaultId: "velvet-9" }));
  assert.ok(refused({ exists: true }));
  assert.ok(refused({ cap: 5_000_001n }));
  assert.ok(refused({ cap: 0n }));
  assert.ok(refused({ lockNs: 1n }));
  assert.ok(refused({ lockNs: 86_400_000_000_001n }));
  assert.ok(refused({ maxCracks: 5 }));
  assert.ok(refused({ maxCracks: 0 }));
  assert.ok(refused({ funds: { ...rich, nearYocto: 10n ** 23n } }));
});

test("set_spec is refused for every reason the contract refuses it", () => {
  const base = { limits, vault: vault({ specHash: null }), accountId: "sponsor.testnet", ctBytes: 4000, card: "A card.", depositYocto: 10n ** 23n, funds: rich };
  assert.equal(preflightSetSpec(base).ok, true);
  const refused = (over: object) => preflightSetSpec({ ...base, ...over }).ok === false;
  assert.ok(refused({ accountId: "stranger.testnet" }));
  assert.ok(refused({ vault: vault({ open: true }) }));
  assert.ok(refused({ vault: vault({ specLocked: true }) }));
  assert.ok(refused({ ctBytes: 0 }));
  assert.ok(refused({ ctBytes: 8301 }));
  assert.ok(refused({ card: "  " }));
  assert.ok(refused({ card: "x".repeat(601) }));
  assert.ok(refused({ card: "bad\u0007" }));
  assert.ok(refused({ funds: { ...rich, nearYocto: 0n } }));
});

test("fund, keeper, and reclaim follow the contract", () => {
  const f = { vault: vault(), accountId: "sponsor.testnet", amount: 10_000_000n, funds: rich, vaultRegistered: true };
  assert.equal(preflightFund(f).ok, true);
  assert.equal(preflightFund({ ...f, accountId: "x.testnet" }).ok, false);
  assert.equal(preflightFund({ ...f, amount: 0n }).ok, false);
  assert.equal(preflightFund({ ...f, vaultRegistered: false }).ok, false);
  assert.equal(preflightFund({ ...f, funds: { ...rich, tokenUnits: 1n } }).ok, false);
  assert.equal(preflightFund({ ...f, funds: { ...rich, nearYocto: GAS_RESERVE_YOCTO - 1n } }).ok, false);
  assert.equal(preflightKeeper({ vault: vault(), accountId: "sponsor.testnet" }).ok, true);
  assert.equal(preflightKeeper({ vault: vault(), accountId: "keeper.testnet" }).ok, false);
  const r = { vault: vault(), accountId: "sponsor.testnet" };
  assert.equal(preflightReclaim(r).ok, true);
  assert.equal(preflightReclaim({ ...r, accountId: "x.testnet" }).ok, false);
  assert.equal(preflightReclaim({ vault: vault({ open: true }), accountId: r.accountId }).ok, false);
  assert.equal(preflightReclaim({ vault: vault({ challengeEnd: "5" }), accountId: r.accountId }).ok, false);
  assert.equal(preflightReclaim({ vault: vault({ reserved: "1" }), accountId: r.accountId }).ok, false);
  assert.equal(preflightReclaim({ vault: vault({ refundInFlight: "1" }), accountId: r.accountId }).ok, false);
  assert.equal(preflightReclaim({ vault: vault({ pot: "0" }), accountId: r.accountId }).ok, false);
});

test("commit is refused for every reason the contract refuses it", () => {
  const now = 1_793_807_668_041_080_320n;
  const base = { limits, vault: vault({ keeper: "keeper.testnet" }), owner: "owner.testnet", accountId: "sponsor.testnet", nowNs: now, opensAtNs: now, hasSignature: true };
  assert.equal(preflightCommit(base).ok, true);
  assert.equal(preflightCommit({ ...base, accountId: "keeper.testnet" }).ok, true);
  const refused = (over: object) => preflightCommit({ ...base, ...over }).ok === false;
  assert.ok(refused({ accountId: "stranger.testnet" }));
  assert.ok(refused({ vault: vault({ open: true }) }));
  assert.ok(refused({ vault: vault({ suspended: true }) }));
  assert.ok(refused({ vault: vault({ guardPk: null }) }));
  assert.ok(refused({ vault: vault({ specHash: null }) }));
  assert.ok(refused({ opensAtNs: now + 86_400_000_000_001n }));
  assert.ok(refused({ hasSignature: false }));
  assert.ok(refused({ vault: vault({ pot: "0" }) }));
  assert.ok(refused({ opensAtNs: 0n }));
  // The owner may open a vault with no story, and is not held to the lead.
  assert.equal(preflightCommit({ ...base, accountId: "owner.testnet", vault: vault({ specHash: null }), opensAtNs: now + 86_400_000_000_001n }).ok, true);
});

test("the sponsor step follows chain state", () => {
  assert.equal(sponsorStep({ accountId: null, vault: null }), "account");
  assert.equal(sponsorStep({ accountId: "a.testnet", vault: null }), "story");
  assert.equal(sponsorStep({ accountId: "a.testnet", vault: vault({ specHash: null }) }), "seal");
  assert.equal(sponsorStep({ accountId: "a.testnet", vault: vault({ pot: "0" }) }), "fund");
  assert.equal(sponsorStep({ accountId: "a.testnet", vault: vault() }), "launch");
  assert.equal(sponsorStep({ accountId: "a.testnet", vault: vault({ specLocked: true }) }), "between");
  assert.equal(sponsorStep({ accountId: "a.testnet", vault: vault({ open: true, specLocked: true }) }), "open");
});

test("a keeper vault that has not opened by half past midnight is flagged", () => {
  const late = Date.UTC(2026, 10, 5, 1, 0, 0);
  const early = Date.UTC(2026, 10, 5, 0, 10, 0);
  const v = vault({ keeper: "keeper.testnet" });
  assert.equal(notOpenTonight(v, late, "keeper.testnet"), true);
  assert.equal(notOpenTonight(v, early, "keeper.testnet"), false);
  assert.equal(notOpenTonight(vault({ keeper: "keeper.testnet", open: true }), late, "keeper.testnet"), false);
  assert.equal(notOpenTonight(vault({ keeper: "other.testnet" }), late, "keeper.testnet"), false);
  assert.equal(notOpenTonight(v, late, null), false);
});
