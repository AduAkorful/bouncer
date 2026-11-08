import assert from "node:assert/strict";
import test from "node:test";
import { admitTurn, blobHash, commitTurn, markKey, type Mark } from "../lib/marks.ts";

test("a second open and a stale blob are refused", () => {
  const marks = new Map<string, Mark>();
  const key = markKey("velvet-1", "1", "player-1");
  assert.equal(admitTurn(marks, "open", key, undefined).ok, true);
  commitTurn(marks, "open", key, "blob-a");
  // Nothing has been played, so a lost reply to `open` can be opened again.
  assert.equal(admitTurn(marks, "open", key, undefined).ok, true);
  assert.deepEqual(admitTurn(marks, "say", key, "blob-b"), { ok: false, error: "stale blob" });
  assert.equal(admitTurn(marks, "bill", key, "blob-a").ok, true);
  assert.equal(marks.get(key)?.hash, blobHash("blob-a"));
  commitTurn(marks, "say", key, "blob-b");
  assert.deepEqual(admitTurn(marks, "open", key, undefined), { ok: false, error: "second open" });
});

test("a retry with the blob the player already held is let through, and an older one is not", () => {
  const marks = new Map<string, Mark>();
  const key = markKey("velvet-1", "1", "player-3");
  commitTurn(marks, "open", key, "blob-0");
  commitTurn(marks, "say", key, "blob-1");
  assert.equal(admitTurn(marks, "say", key, "blob-0").ok, true);
  assert.equal(admitTurn(marks, "say", key, "blob-1").ok, true);
  commitTurn(marks, "say", key, "blob-2");
  assert.deepEqual(admitTurn(marks, "say", key, "blob-0"), { ok: false, error: "stale blob" });
  assert.equal(admitTurn(marks, "say", key, "blob-1").ok, true);
  // A retry answered from the guard's stored reply returns the blob already recorded.
  commitTurn(marks, "say", key, "blob-2");
  assert.equal(marks.get(key)?.prev, blobHash("blob-1"));
});

test("a player this process has not seen is forwarded to the guard", () => {
  const marks = new Map<string, Mark>();
  const key = markKey("velvet-1", "1", "player-2");
  assert.equal(admitTurn(marks, "say", key, "blob-a").ok, true);
  assert.deepEqual(admitTurn(marks, "bill", key, ""), { ok: false, error: "stale blob" });
});
