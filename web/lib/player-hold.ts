/** This browser's sign-in. The passkey is still the key. Logging out clears the sign-in. */

import { unlockDevice } from "./device-pass.ts";

const HOLD = "bouncer.player.hold.v1";

type HoldStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

let memory: Uint8Array | null = null;

function browserStore(): HoldStore | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function encode(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decode(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/.test(value)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function holdIkm(ikm: Uint8Array, store: HoldStore | null = browserStore()) {
  if (ikm.length !== 32) return;
  memory = ikm.slice();
  store?.setItem(HOLD, encode(memory));
}

export function readHold(store: HoldStore | null = browserStore()): Uint8Array | null {
  if (memory?.length === 32) return memory.slice();
  const raw = store?.getItem(HOLD);
  const bytes = raw ? decode(raw) : null;
  if (!bytes) {
    if (raw) store?.removeItem(HOLD);
    return null;
  }
  memory = bytes;
  return bytes.slice();
}

export function clearHold(store: HoldStore | null = browserStore()) {
  memory?.fill(0);
  memory = null;
  store?.removeItem(HOLD);
}

/** Uses the sign-in when this browser already has one. Otherwise asks for the passkey and keeps it. */
export async function unlockHeld(signal?: AbortSignal): Promise<{ ikm: Uint8Array } | { error: string }> {
  const held = readHold();
  if (held) return { ikm: held };
  const unlocked = await unlockDevice(signal);
  if ("ikm" in unlocked) holdIkm(unlocked.ikm);
  return unlocked;
}
