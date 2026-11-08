import assert from "node:assert/strict";
import test from "node:test";
import { raidHistoryHref, raidHistoryLabel, raidHistoryRow } from "../lib/raid-history.ts";

test("a raid record becomes a door, a round, and a state", () => {
  assert.deepEqual(raidHistoryRow("qa-coast-05:2", { blob: null, verdict: null, notes: [{ text: "owed 10.11" }], privateKey: {} }), {
    vaultId: "qa-coast-05",
    round: "2",
    state: "shut",
  });
  assert.equal(raidHistoryRow("qa-coast-05:2", { blob: "sealed", verdict: null })?.state, "opened");
  assert.equal(raidHistoryRow("velvet-1:1", { blob: "sealed", verdict: { amount: "100" } })?.state, "in");
  assert.equal(raidHistoryLabel("in"), "Got in");
  assert.equal(raidHistoryLabel("opened"), "Opened");
  assert.equal(raidHistoryLabel("shut"), "Not opened");
});

test("transcripts and unsafe keys are left out", () => {
  assert.equal(raidHistoryRow("transcript:velvet-1:1", [{ you: "owed 10.11" }]), null);
  assert.equal(raidHistoryRow("velvet-1:1:extra", { blob: "sealed" }), null);
  assert.equal(raidHistoryRow("bad id:1", { blob: "sealed" }), null);
  assert.equal(raidHistoryRow("velvet-1:round", { blob: "sealed" }), null);
  assert.equal(raidHistoryRow("velvet-1:1", []), null);
});

test("a raid links to that vault's own pages", () => {
  const opened = { vaultId: "velvet-1", round: "1", state: "opened" as const };
  assert.equal(raidHistoryHref(opened), "/v/velvet-1/play");
  assert.equal(raidHistoryHref({ ...opened, state: "in" }), "/v/velvet-1/claim");
  assert.equal(raidHistoryHref({ ...opened, state: "shut" }), "/v/velvet-1");
  assert.equal(raidHistoryHref({ vaultId: "qa-coast-05", round: "2", state: "opened" }), "/v/qa-coast-05/play");
});
