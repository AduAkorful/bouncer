import assert from "node:assert/strict";
import test from "node:test";
import { mergeHistory, raidHistoryHref, raidHistoryLabel, raidHistoryRow } from "../lib/raid-history.ts";

test("a raid record becomes a door, a round, and a state", () => {
  assert.deepEqual(raidHistoryRow("qa-coast-05:2", { blob: null, verdict: null, notes: [{ text: "owed 10.11" }], privateKey: {} }), {
    vaultId: "qa-coast-05",
    round: "2",
    state: "shut",
  });
  assert.equal(raidHistoryRow("qa-coast-05:2", { blob: "sealed", verdict: null })?.state, "opened");
  assert.equal(raidHistoryRow("velvet-1:1", { blob: "sealed", verdict: { amount: "100" }, signature: "ab" })?.state, "held");
  // An approval stored before signatures were kept cannot be sent, so it is not called held.
  assert.equal(raidHistoryRow("velvet-1:1", { blob: "sealed", verdict: { amount: "100" } })?.state, "stuck");
  assert.equal(raidHistoryRow("velvet-1:1", { blob: "sealed", verdict: { amount: "100" }, transactionHash: "abc" })?.state, "in");
  assert.equal(raidHistoryRow("velvet-1:1", { blob: "sealed", verdict: { amount: "100" }, transactionHash: null, recorded: true })?.state, "in");
  assert.equal(raidHistoryLabel("held"), "Approved, not recorded");
  assert.equal(raidHistoryLabel("in"), "Got in");
  assert.equal(raidHistoryLabel("opened"), "Played");
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
  assert.equal(raidHistoryHref(opened), "/v/velvet-1/reveal?round=1");
  assert.equal(raidHistoryHref({ ...opened, state: "in" }), `/v/velvet-1/claim?round=${opened.round}`);
  assert.equal(raidHistoryHref({ ...opened, state: "held" }), `/v/velvet-1/claim?round=${opened.round}`);
  assert.equal(raidHistoryHref({ ...opened, state: "stuck" }), `/v/velvet-1/claim?round=${opened.round}`);
  assert.equal(raidHistoryHref({ ...opened, state: "shut" }), "/v/velvet-1");
  assert.equal(raidHistoryHref({ vaultId: "qa-coast-05", round: "2", state: "opened" }), "/v/qa-coast-05/reveal?round=2");
});

test("history merges the server's nights with this browser's raids, keeping the further state", () => {
  const device = [
    { vaultId: "qa-coast-05", round: "2", state: "opened" as const },
    { vaultId: "osu-night-12", round: "1", state: "held" as const },
  ];
  const merged = mergeHistory(device, [
    { vaultId: "qa-coast-05", round: "2", state: "in" },
    { vaultId: "qa-coast-05", round: "5", state: "opened" },
    { vaultId: "osu-night-12", round: "1", state: "opened" },
    { vaultId: "bad id", round: "1", state: "opened" },
  ]);
  assert.deepEqual(merged, [
    { vaultId: "osu-night-12", round: "1", state: "held" },
    { vaultId: "qa-coast-05", round: "5", state: "opened" },
    { vaultId: "qa-coast-05", round: "2", state: "in" },
  ]);
});
