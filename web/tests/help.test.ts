import assert from "node:assert/strict";
import test from "node:test";
import { TIP_IDS, helpPanels, lockWords, tipText } from "../lib/help.ts";
import { markTip, resetTips, skipTips, tipSeen } from "../lib/tips.ts";

function text(values = {}) {
  return helpPanels(values).flatMap((p) => [p.title, ...p.lines]).join("\n");
}

test("help fills in a door's numbers and leaves them out when unknown", () => {
  const known = text({ budget: 6, lockNs: "600000000000" });
  assert.match(known, /You get 6 messages a raid/);
  assert.match(known, /time lock runs for 10 minutes/);
  const unknown = text({});
  assert.match(unknown, /a few messages/);
  assert.match(unknown, /the door's time lock runs, with a countdown/);
  for (const t of [known, unknown, text({ budget: 0, lockNs: "abc" })]) {
    assert.doesNotMatch(t, /undefined|NaN|null/);
  }
});

test("help keeps the rules the game must not break", () => {
  const all = [text({ budget: 6 }), ...TIP_IDS.map((id) => tipText(id, 6)), tipText("messages")].join("\n");
  assert.match(all, /“Not approved.”/);
  assert.doesNotMatch(all, /\b(easier|weaker|softer)\b/i);
  assert.doesNotMatch(all, /\brpc\b|\bundefined\b/i);
  assert.match(tipText("messages"), /^Each message costs one of your messages\.$/);
});

test("lock words read minutes and hours, and refuse nonsense", () => {
  assert.equal(lockWords("60000000000"), "1 minute");
  assert.equal(lockWords("5400000000000"), "1 hour 30 minutes");
  assert.equal(lockWords("7200000000000"), "2 hours");
  assert.equal(lockWords("1"), null);
  assert.equal(lockWords(undefined), null);
  assert.equal(lockWords("-5"), null);
});

function fakeStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

test("tips are seen once, skip turns them all off, reset brings them back", () => {
  const s = fakeStore();
  resetTips(s);
  assert.equal(tipSeen("desk", s), false);
  markTip("desk", s);
  assert.equal(tipSeen("desk", s), true);
  assert.equal(tipSeen("bill", s), false);
  skipTips(s);
  for (const id of TIP_IDS) assert.equal(tipSeen(id, s), true);
  resetTips(s);
  for (const id of TIP_IDS) assert.equal(tipSeen(id, s), false);
});

test("a store that throws still remembers for this page", () => {
  const broken = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  resetTips(broken);
  assert.equal(tipSeen("bill", broken), false);
  markTip("bill", broken);
  assert.equal(tipSeen("bill", broken), true);
  resetTips(broken);
});
