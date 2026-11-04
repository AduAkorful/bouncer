import assert from "node:assert/strict";
import test from "node:test";
import { createKeeper, type KeeperChain } from "./keeper.ts";
import { limitsView, vaultRow, SECRETS } from "./testkit.ts";
import { parseVault, type VaultView } from "../../web/lib/vault.ts";
import type { Call } from "../../web/lib/vault-calls.ts";

const NOW_NS = 1_793_900_000_000_000_000n;
const view = (over: Record<string, unknown> = {}): VaultView => {
  const parsed = parseVault(vaultRow(over));
  if (!parsed.ok) throw new Error("fixture");
  return parsed.vault;
};

function world(vaults: Record<string, VaultView>, over: Partial<KeeperChain> = {}) {
  const sent: Call[] = [];
  const commits: string[] = [];
  const chain: KeeperChain = {
    contractId: "vault.test",
    listVaults: async (from) => (from === 0 ? Object.keys(vaults) : []),
    readVault: async (id) => vaults[id] ?? null,
    limits: async () => limitsView,
    owner: async () => "owner.test",
    nowNs: async () => NOW_NS,
    commit: async (id) => {
      commits.push(id);
      return { ok: true, commit: { commitment: "11".repeat(32), guardVersion: "22".repeat(32), signature: "33".repeat(64), round: 2 } };
    },
    send: async (call) => {
      sent.push(call);
      if (call.method === "close_round") vaults[String(call.args.vault_id)] = { ...vaults[String(call.args.vault_id)], open: false, closedPendingBump: true };
      if (call.method === "commit_round") vaults[String(call.args.vault_id)] = { ...vaults[String(call.args.vault_id)], open: true, closesAt: String(NOW_NS + 86_400_000_000_000n) };
      return { ok: true, hash: `h-${sent.length}` };
    },
    ...over,
  };
  let clock = 1_000_000;
  const lines: string[] = [];
  const keeper = createKeeper(chain, "keeper.test", () => clock, (l) => lines.push(l));
  return { keeper, sent, commits, lines, tick: (ms: number) => (clock += ms), vaults };
}

test("an expired round is closed and the next one opened", async () => {
  const w = world({ anchor: view({ open: true, closes_at: String(NOW_NS - 1n) }) });
  await w.keeper.pass();
  assert.deepEqual(w.sent.map((c) => c.method), ["close_round", "commit_round"]);
  assert.equal(w.sent[1].args.opens_at, Number(NOW_NS));
  assert.equal(w.keeper.status().anchor.action, "opened");
});

test("a round still running is left alone", async () => {
  const w = world({ anchor: view({ open: true, closes_at: String(NOW_NS + 5_000_000_000n) }) });
  await w.keeper.pass();
  assert.equal(w.sent.length, 0);
  assert.equal(w.commits.length, 0);
});

test("a closed funded vault is opened once and not again", async () => {
  const w = world({ anchor: view() });
  await w.keeper.pass();
  await w.keeper.pass();
  assert.deepEqual(w.sent.map((c) => c.method), ["commit_round"]);
});

test("empty, suspended, spec-less, and other keepers' vaults make no guard call and no transaction", async () => {
  const w = world({
    empty: view({ pot: "0" }),
    held: view({ suspended: true }),
    bare: view({ spec_hash: null }),
    theirs: view({ keeper: "other.test" }),
    nobody: view({ keeper: null }),
  });
  await w.keeper.pass();
  assert.equal(w.sent.length, 0);
  assert.equal(w.commits.length, 0);
  assert.match(w.keeper.status().empty.detail, /pot is empty/);
  assert.match(w.keeper.status().held.detail, /suspended/);
  assert.match(w.keeper.status().bare.detail, /no story/);
  assert.equal(w.keeper.status().theirs, undefined);
});

test("a vault that was not mine is looked at again later", async () => {
  const vaults = { late: view({ keeper: null }) };
  const w = world(vaults);
  await w.keeper.pass();
  vaults.late = view();
  await w.keeper.pass();
  assert.equal(w.sent.length, 0);
  w.tick(11 * 60_000);
  await w.keeper.pass();
  assert.equal(w.sent.length, 1);
});

test("a failed vault backs off and is tried again later", async () => {
  let fail = true;
  const w = world({ anchor: view() }, {
    send: async (call) => (fail ? { ok: false, error: "not owner" } : { ok: true, hash: `ok-${call.method}` }),
  });
  await w.keeper.pass();
  assert.equal(w.keeper.status().anchor.action, "failed");
  await w.keeper.pass();
  assert.equal(w.commits.length, 1);
  fail = false;
  w.tick(11 * 60_000);
  await w.keeper.pass();
  assert.equal(w.keeper.status().anchor.action, "opened");
});

test("a pass is skipped when the vault's limits or the vault list cannot be read", async () => {
  const a = world({ anchor: view() }, { limits: async () => null });
  await a.keeper.pass();
  assert.equal(a.sent.length, 0);
  const b = world({ anchor: view() }, { listVaults: async () => null });
  await b.keeper.pass();
  assert.equal(b.sent.length, 0);
  const c = world({ anchor: view() }, { nowNs: async () => null });
  await c.keeper.pass();
  assert.equal(c.sent.length, 0);
});

test("a guard that will not sign is a skip, not a transaction", async () => {
  const w = world({ anchor: view() }, { commit: async () => ({ ok: false, error: "guard" }) });
  await w.keeper.pass();
  assert.equal(w.sent.length, 0);
  assert.equal(w.keeper.status().anchor.action, "skipped");
});

test("the same reason is logged once and no secret is logged", async () => {
  const w = world({ empty: view({ pot: "0" }) });
  await w.keeper.pass();
  await w.keeper.pass();
  await w.keeper.pass();
  assert.equal(w.lines.length, 1);
  for (const secret of SECRETS) assert.equal(w.lines.join("\n").includes(secret), false);
});

test("at most 25 actions in one pass, and the rest wait for the next", async () => {
  const vaults: Record<string, VaultView> = {};
  for (let i = 0; i < 30; i += 1) vaults[`v${i}`] = view();
  const w = world(vaults);
  await w.keeper.pass();
  assert.equal(w.sent.length, 25);
  await w.keeper.pass();
  assert.equal(w.sent.length, 30);
});
