import assert from "node:assert/strict";
import test from "node:test";
import { clearHold, holdIkm, readHold } from "../lib/player-hold.ts";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test("a sign-in stays until logout and a short value is ignored", () => {
  const store = memoryStore();
  clearHold(store);
  holdIkm(new Uint8Array(16), store);
  assert.equal(readHold(store), null);
  const ikm = new Uint8Array(32).map((_, i) => i + 1);
  holdIkm(ikm, store);
  ikm.fill(0);
  const again = readHold(store);
  assert.ok(again);
  assert.equal(again[0], 1);
  assert.equal(again[31], 32);
  clearHold(store);
  assert.equal(readHold(store), null);
});
