import { baseDecode } from "near-api-js";
import { importClaimKey, type DeviceSecrets } from "./device-pass.ts";

export type StoredNote = {
  id: string;
  text: string;
  source: "Heard" | "Receipt" | "Poster" | "Found";
  mark?: "true" | "rumour";
};

export type StoredStreet = {
  payees: string[];
  poster: string[];
  queue: { who: string; lines: { text: string; note: string }[] }[];
};

export type StoredRaid = {
  privateKey: CryptoKey;
  publicKeyHex: string;
  playerId: string;
  raidId: string;
  blob: string | null;
  verdict: unknown | null;
  transactionHash: string | null;
  street: StoredStreet | null;
  notes: StoredNote[];
};

export async function loadRaid(storageName: string, vaultId: string, round: string): Promise<StoredRaid | null | { error: string }> {
  if (!storageName || !vaultId || !round) return { error: "missing env" };
  try {
    const db = await openDb(storageName);
    const found = await getRecord(db, `${vaultId}:${round}`);
    return found ? ready(found) : null;
  } catch {
    return { error: "claim key" };
  }
}

export async function loadOrCreateRaid(storageName: string, vaultId: string, round: string): Promise<StoredRaid | { error: string }> {
  if (!storageName || !vaultId || !round) return { error: "missing env" };
  let db: IDBDatabase;
  try {
    db = await openDb(storageName);
  } catch {
    return { error: "claim key" };
  }
  const key = `${vaultId}:${round}`;
  const existing = await getRecord(db, key);
  if (existing) return ready(existing);
  const created = await createRaid();
  if ("error" in created) return created;
  await putRecord(db, key, created);
  return created;
}

export async function saveRaid(storageName: string, vaultId: string, round: string, raid: StoredRaid) {
  const db = await openDb(storageName);
  await putRecord(db, `${vaultId}:${round}`, raid);
}

export async function signClaim(storageName: string, vaultId: string, round: string, message: Uint8Array): Promise<Uint8Array | { error: string }> {
  const db = await openDb(storageName);
  const raid = await getRecord(db, `${vaultId}:${round}`);
  if (!raid) return { error: "claim key" };
  try {
    const signature = await crypto.subtle.sign({ name: "Ed25519" }, raid.privateKey, new Uint8Array(message));
    return new Uint8Array(signature);
  } catch {
    return { error: "claim key" };
  }
}

export function mintRaid(): Promise<StoredRaid | { error: string }> {
  return createRaid();
}

export async function raidFromDevice(secrets: DeviceSecrets): Promise<StoredRaid | { error: string }> {
  try {
    const seed = baseDecode(secrets.claimSecret.slice("ed25519:".length)).slice(0, 32);
    const privateKey = await importClaimKey(seed);
    seed.fill(0);
    return {
      privateKey,
      publicKeyHex: secrets.claimPublicKeyHex,
      playerId: secrets.claimPublicKeyHex,
      raidId: secrets.raidId,
      blob: null,
      verdict: null,
      street: null,
      notes: [],
      transactionHash: null,
    };
  } catch {
    return { error: "passkey" };
  }
}

async function createRaid(): Promise<StoredRaid | { error: string }> {
  try {
    const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const publicKeyHex = [...raw].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const raidBytes = new Uint8Array(16);
    crypto.getRandomValues(raidBytes);
    const raidId = [...raidBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return {
      privateKey: pair.privateKey,
      publicKeyHex,
      playerId: publicKeyHex,
      raidId,
      blob: null,
      verdict: null,
      street: null,
      notes: [],
      transactionHash: null,
    };
  } catch {
    return { error: "claim key" };
  }
}

function ready(raid: StoredRaid): StoredRaid {
  return { ...raid, street: raid.street ?? null, notes: raid.notes ?? [] };
}

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("raids")) request.result.createObjectStore("raids");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getRecord(db: IDBDatabase, key: string): Promise<StoredRaid | null> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("raids").objectStore("raids").get(key);
    request.onsuccess = () => resolve((request.result as StoredRaid | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(db: IDBDatabase, key: string, value: StoredRaid) {
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction("raids", "readwrite").objectStore("raids").put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
