import assert from "node:assert/strict";
import test from "node:test";
import { doorEconomy } from "../lib/door-economy.ts";
import type { VaultView } from "../lib/vault.ts";

const vault = (over: Partial<VaultView> = {}): VaultView => ({
  sponsor: "s.testnet", pot: "4000000", dayPot: "15000000", reserved: "6810000", cap: "15000000", lockNs: "600000000000",
  rule: "PayTheBill", guardPk: null, commitment: null, guardVersion: null, round: "2", opensAt: "0", closesAt: "0", open: true,
  challengeEnd: null, maxCracks: 2, ticketed: false, closedPendingBump: false, refundInFlight: "0", crackCount: 1, keeper: null,
  specHash: null, card: null, specLocked: true, suspended: false, ...over,
});

test("the tiles are the vault's own pot, day pot and reserved amounts", () => {
  const e = doorEconomy(vault(), false);
  assert.deepEqual(e.tiles.map((t) => [t.id, t.atomic]), [["reserve", "4000000"], ["tonight", "15000000"], ["held", "6810000"]]);
  assert.deepEqual(e.cracks, { capAtomic: "15000000", taken: 1, max: 2 });
});

test("zero is shown, not hidden, and a shut round says where its pot goes", () => {
  const e = doorEconomy(vault({ open: false, dayPot: "0", reserved: "0" }), true);
  assert.deepEqual(e.tiles.map((t) => t.atomic), ["4000000", "0", "0"]);
  assert.match(e.tiles[1].note, /over/);
  // A round past its close that the keeper has not closed yet still holds its day pot, and says it is over.
  assert.match(doorEconomy(vault({ open: true }), true).tiles[1].note, /goes back to the reserve/);
});

test("a split-the-day door has no per-crack cap and says winners split the pot", () => {
  const e = doorEconomy(vault({ rule: "SplitTheDay" }), false);
  assert.equal(e.cracks, null);
  assert.ok(e.steps.some((s) => s.includes("split")));
  assert.ok(doorEconomy(vault(), false).steps.every((s) => !s.includes("split")));
});
