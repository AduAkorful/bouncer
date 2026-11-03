import assert from "node:assert/strict";
import test from "node:test";
import { admitTurn, blobHash, commitTurn, markKey, type Mark } from "./marks.ts";

test("a second open and a stale blob are refused", () => {
  const marks = new Map<string, Mark>();
  const key = markKey("velvet-1", "1", "player-1");
  assert.equal(admitTurn(marks, "open", key, undefined).ok, true);
  commitTurn(marks, "open", key, "blob-a");
  assert.deepEqual(admitTurn(marks, "open", key, undefined), { ok: false, error: "second open" });
  assert.deepEqual(admitTurn(marks, "say", key, "blob-b"), { ok: false, error: "stale blob" });
  assert.equal(admitTurn(marks, "bill", key, "blob-a").ok, true);
  assert.equal(marks.get(key)?.hash, blobHash("blob-a"));
});
