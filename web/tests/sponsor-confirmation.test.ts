import assert from "node:assert/strict";
import test from "node:test";
import { confirmSponsorVault } from "../lib/sponsor-confirmation.ts";
import type { VaultView } from "../lib/vault.ts";

const keeper = "keeper.testnet";
const commitment = "ab".repeat(32);
const closed: VaultView = {
  sponsor: "sponsor.testnet", round: "1", keeper: null, commitment: null, open: false,
  pot: "20000000", dayPot: "0", reserved: "0", cap: "20000000", lockNs: "60000000000", rule: "PayTheBill",
  guardPk: null, guardVersion: null, opensAt: "0", closesAt: "0", challengeEnd: null, maxCracks: 1, ticketed: false,
  closedPendingBump: false, refundInFlight: "0", crackCount: 0, specHash: null, card: null, specLocked: false, suspended: false,
};
const enabled = { ...closed, keeper };
const open = { ...enabled, open: true, round: "2", commitment, closesAt: String(BigInt(Date.now() + 60_000) * 1_000_000n) };

test("keeper confirmation waits for the requested On or Off state", async () => {
  for (const [stale, current] of [[closed, enabled], [enabled, closed]]) {
    let reads = 0;
    const result = await confirmSponsorVault(
      async () => ({ ok: true, vault: ++reads === 1 ? stale : current }),
      { keeper: current.keeper },
      () => true,
      { intervalMs: 0 },
    );
    assert.equal(result, current);
    assert.equal(reads, 2);
  }
});

test("launch confirmation needs an open door with the expected round and commitment", async () => {
  const reads = [
    { ...open, round: "1" },
    { ...open, commitment: "00".repeat(32) },
    { ...open, open: false },
    { ...open, closesAt: "1" },
    open,
  ];
  const result = await confirmSponsorVault(
    async () => ({ ok: true, vault: reads.shift() ?? null }),
    { round: "2", commitment },
    () => true,
    { intervalMs: 0 },
  );
  assert.equal(result, open);
  assert.equal(reads.length, 0);
});

test("a pending read cannot confirm an action for an outdated selection", async () => {
  let current = true;
  const result = await confirmSponsorVault(
    async () => {
      await Promise.resolve();
      current = false;
      return { ok: true, vault: enabled };
    },
    { keeper },
    () => current,
  );
  assert.equal(result, null);
});

test("deadline leaves a stale or failed read unconfirmed", async () => {
  let reads = 0;
  const result = await confirmSponsorVault(
    async () => ++reads === 1 ? { ok: false } : { ok: true, vault: closed },
    { keeper },
    () => true,
    { timeoutMs: 40, intervalMs: 5 },
  );
  assert.equal(result, null);
  assert.ok(reads >= 1);
});
