import assert from "node:assert/strict";
import test from "node:test";
import { clearHold, holdIkm, readHold, type HoldStore } from "../lib/player-hold.ts";

function memoryStore(legacy: Record<string, string> = {}) {
  let sealed: Awaited<ReturnType<HoldStore["read"]>> = null;
  const values = new Map(Object.entries(legacy));
  const store: HoldStore & { saved: () => typeof sealed } = {
    read: async () => sealed,
    write: async (value) => { sealed = value; },
    remove: async () => { sealed = null; },
    legacy: { getItem: (key) => values.get(key) ?? null, removeItem: (key) => { values.delete(key); } },
    saved: () => sealed,
  };
  return { store, values };
}

test("a sign-in stays until logout and a short value is ignored", async () => {
  const { store } = memoryStore();
  await clearHold(store);
  await holdIkm(new Uint8Array(16), store);
  assert.equal(await readHold(store), null);
  const ikm = new Uint8Array(32).map((_, i) => i + 1);
  await holdIkm(ikm, store);
  ikm.fill(0);
  const again = await readHold(store);
  assert.ok(again);
  assert.equal(again[0], 1);
  assert.equal(again[31], 32);
  await clearHold(store);
  assert.equal(await readHold(store), null);
});

test("what is stored is sealed: it holds no copy of the secret and the key cannot be exported", async () => {
  const { store } = memoryStore();
  const ikm = new Uint8Array(32).map((_, i) => (i * 7 + 3) & 255);
  await holdIkm(ikm, store);
  const sealed = store.saved();
  assert.ok(sealed);
  assert.equal(sealed.key.extractable, false);
  const stored = Buffer.from(sealed.data).toString("hex");
  assert.ok(!stored.includes(Buffer.from(ikm).toString("hex")));
  await assert.rejects(crypto.subtle.exportKey("raw", sealed.key));
  await clearHold(store);
});

test("a later page load opens the sealed copy, and a damaged one signs out", async () => {
  const { store } = memoryStore();
  const ikm = new Uint8Array(32).fill(9);
  await holdIkm(ikm, store);
  // A fresh page has nothing in memory. Clearing memory the way a reload would, but keeping the stored copy:
  const sealed = store.saved()!;
  await clearHold({ ...store, remove: async () => undefined, legacy: undefined });
  const reopened = await readHold({ ...store, read: async () => sealed });
  assert.ok(reopened);
  assert.equal(reopened[0], 9);
  await clearHold({ ...store, remove: async () => undefined, legacy: undefined });
  const damaged = { ...sealed, data: new Uint8Array(sealed.data).map((b) => b ^ 255).buffer };
  assert.equal(await readHold({ ...store, read: async () => damaged }), null);
});

test("an older unsealed sign-in is moved into the sealed store and removed", async () => {
  const hex = "ab".repeat(32);
  const { store, values } = memoryStore({ "bouncer.player.hold.v1": hex });
  await clearHold({ ...store, legacy: undefined });
  const found = await readHold(store);
  assert.ok(found);
  assert.equal(found[0], 0xab);
  assert.equal(values.has("bouncer.player.hold.v1"), false);
  assert.ok(store.saved());
  await clearHold(store);
});
