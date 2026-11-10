/**
 * This browser's sign-in. The passkey is still the key. Logging out clears the sign-in.
 *
 * The passkey's secret is never written down in the clear. It is sealed with an AES-GCM key the browser makes
 * and will not hand over (non-extractable), and only the sealed copy is stored, so a copy of this site's
 * storage holds nothing that can spend. A script running on the page could still ask the browser to open it,
 * which is why the page also sets a content security policy.
 */

import { unlockDevice } from "./device-pass.ts";

/** The older, unsealed copy. It is moved into the sealed store the first time it is seen, then removed. */
const LEGACY = "bouncer.player.hold.v1";
const DB = "bouncer-hold";
const STORE = "hold";
const SLOT = "ikm";

type Sealed = { key: CryptoKey; iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };

export type HoldStore = {
  read(): Promise<Sealed | null>;
  write(value: Sealed): Promise<void>;
  remove(): Promise<void>;
  /** Where an older unsealed copy may sit. */
  legacy?: { getItem(key: string): string | null; removeItem(key: string): void };
};

let memory: Uint8Array | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function request<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function browserStore(): HoldStore | null {
  if (typeof indexedDB === "undefined") return null;
  return {
    async read() {
      const found = (await request(await openDb(), "readonly", (s) => s.get(SLOT))) as Sealed | undefined;
      return found && found.key && found.iv && found.data ? found : null;
    },
    async write(value) {
      await request(await openDb(), "readwrite", (s) => s.put(value, SLOT));
    },
    async remove() {
      await request(await openDb(), "readwrite", (s) => s.delete(SLOT));
    },
    legacy: typeof localStorage === "undefined" ? undefined : localStorage,
  };
}

function decodeLegacy(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/.test(value)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function seal(ikm: Uint8Array): Promise<Sealed> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ikm as Uint8Array<ArrayBuffer>);
  return { key, iv, data };
}

async function open(sealed: Sealed): Promise<Uint8Array | null> {
  try {
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.iv }, sealed.key, sealed.data));
    return plain.length === 32 ? plain : null;
  } catch {
    return null;
  }
}

export async function holdIkm(ikm: Uint8Array, store: HoldStore | null = browserStore()): Promise<void> {
  if (ikm.length !== 32) return;
  memory = ikm.slice();
  if (!store) return;
  try {
    await store.write(await seal(memory));
    store.legacy?.removeItem(LEGACY);
  } catch {
    // Without storage the sign-in lasts as long as this tab, and the next prompt asks again.
  }
}

export async function readHold(store: HoldStore | null = browserStore()): Promise<Uint8Array | null> {
  if (memory?.length === 32) return memory.slice();
  if (!store) return null;
  try {
    const sealed = await store.read();
    if (sealed) {
      const bytes = await open(sealed);
      if (bytes) {
        memory = bytes;
        return bytes.slice();
      }
      await store.remove();
    }
    // A sign-in made before the sealed store existed: keep it, and stop leaving it in the clear.
    const raw = store.legacy?.getItem(LEGACY);
    if (raw) {
      const old = decodeLegacy(raw);
      if (old) {
        await holdIkm(old, store);
        return old.slice();
      }
      store.legacy?.removeItem(LEGACY);
    }
  } catch {
    return null;
  }
  return null;
}

export async function clearHold(store: HoldStore | null = browserStore()): Promise<void> {
  memory?.fill(0);
  memory = null;
  store?.legacy?.removeItem(LEGACY);
  try {
    await store?.remove();
  } catch {
    // Nothing is left to clear if the store cannot be reached.
  }
}

/** Uses the sign-in when this browser already has one. Otherwise asks for the passkey and keeps it. */
export async function unlockHeld(signal?: AbortSignal): Promise<{ ikm: Uint8Array } | { error: string }> {
  const held = await readHold();
  if (held) return { ikm: held };
  const unlocked = await unlockDevice(signal);
  if ("ikm" in unlocked) await holdIkm(unlocked.ikm);
  return unlocked;
}

/** Makes a new passkey on this device and keeps the sign-in, the same as the profile's Create a passkey. */
export async function createHeld(signal?: AbortSignal): Promise<{ ikm: Uint8Array } | { error: string }> {
  const created = await unlockDevice(signal, "create");
  if ("ikm" in created) await holdIkm(created.ikm);
  return created;
}
