import { baseDecode } from "near-api-js";
import { importClaimKey, type DeviceSecrets } from "./device-pass.ts";
import { raidHistoryRow, type RaidHistoryRow } from "./raid-history.ts";
import type { ProofBundle } from "./proof-bundle.ts";

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
  /** The guard's signature over `verdict`, kept until the vault records it. */
  signature?: string | null;
  transactionHash: string | null;
  /** Messages the guard has counted on this raid. */
  used?: number;
  /** The evidence the guard gave for this raid: the model's attestation and the verdict's attestation. */
  proof?: ProofBundle | null;
  /** A guard call sent and not yet answered. A reload sends it again, and the guard replies from its store. */
  pending?: { body: Record<string, unknown>; bill: boolean; playerText: string } | null;
  /** One entry per message the guard counted: chat is "ask", a bill is "refused" or "approved". The ending reads it. */
  outcomes?: ("ask" | "refused" | "approved")[];
  /** The vault has a crack for this raid, even when the transaction that recorded it was not seen here. */
  recorded?: boolean;
  /** Why the vault refused the held verdict. Set, the verdict is not sent again on its own. */
  refused?: string | null;
  /** The claim transaction, once the vault was asked to pay. */
  payoutHash?: string | null;
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
  const payout = typeof raid.payoutHash === "string" ? raid.payoutHash : null;
  return { ...raid, street: raid.street ?? null, notes: raid.notes ?? [], payoutHash: payout };
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

function allRecords(db: IDBDatabase): Promise<{ key: IDBValidKey; value: unknown }[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("raids");
    const store = tx.objectStore("raids");
    const keysRequest = store.getAllKeys();
    const valuesRequest = store.getAll();
    tx.oncomplete = () => {
      const keys = keysRequest.result ?? [];
      const values = valuesRequest.result ?? [];
      resolve(keys.map((key, index) => ({ key, value: values[index] })));
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
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

/** Raid rows on this browser. Notes, transcripts, and keys are not returned. */
export async function listRaidHistory(storageName: string): Promise<RaidHistoryRow[] | { error: string }> {
  const name = storageName.trim();
  if (!name) return { error: "storage" };
  try {
    const db = await openDb(name);
    const records = await allRecords(db);
    const rows = records.flatMap(({ key, value }) => {
      const row = raidHistoryRow(key, value);
      return row ? [row] : [];
    });
    rows.sort((a, b) => a.vaultId.localeCompare(b.vaultId) || Number(a.round) - Number(b.round));
    return rows;
  } catch {
    return { error: "storage" };
  }
}

/** Transcript uses a separate record so note and raid state writes cannot overwrite it. */
export async function loadTranscript(name: string, vault: string, round: string): Promise<import("./raid-transcript.ts").Exchange[]> {
  const { parseTranscript } = await import("./raid-transcript.ts");
  const db = await openDb(name);
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction("raids").objectStore("raids").get(`transcript:${vault}:${round}`);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return parseTranscript(value ?? []);
}

export async function saveTranscript(name: string, vault: string, round: string, transcript: import("./raid-transcript.ts").Exchange[]): Promise<void> {
  const db = await openDb(name);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("raids", "readwrite");
    tx.objectStore("raids").put(transcript, `transcript:${vault}:${round}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Log out. Raids, their transcripts and notes leave this browser. A win the vault has not recorded stays, with its
 * signed verdict, so logging out can never lose a payout that was earned; the passkey rebuilds the rest.
 * Returns how many records were kept for that reason.
 */
export async function clearForLogout(storageName: string): Promise<number> {
  const name = storageName.trim();
  if (!name) return 0;
  let kept = 0;
  try {
    const db = await openDb(name);
    const records = await allRecords(db);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("raids", "readwrite");
      const store = tx.objectStore("raids");
      for (const { key, value } of records) {
        const raid = value as Partial<StoredRaid> | null;
        const holdsUnrecordedWin = Boolean(raid && typeof raid === "object" && !Array.isArray(raid) && raid.verdict && raid.signature && raid.recorded === false && !raid.refused);
        if (holdsUnrecordedWin) {
          kept += 1;
          continue;
        }
        store.delete(key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // Nothing more can be cleared if storage cannot be opened.
  }
  return kept;
}
