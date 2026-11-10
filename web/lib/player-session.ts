"use client";

/** The phone signs in. The server keeps the name, the streak, and the nights. */

import { KeyPair, type KeyPairString } from "near-api-js";
import { apiPost } from "./api.ts";
import { deriveSecrets, type DeviceSecrets } from "./device-pass.ts";
import { unlockHeld } from "./player-hold.ts";

export type PlayerSession = {
  player: { name: string; renameUsed: boolean; streak: number; nights: number; created: string; raidedToday?: boolean };
  place: number | null;
  line: string | null;
  nights: { vaultId: string; round: string; state: "opened" | "in"; day: string }[];
};

export async function loadPlayerSession(): Promise<{ ok: true; session: PlayerSession } | { ok: false; error: string }> {
  const unlocked = await unlockHeld();
  if ("error" in unlocked) return { ok: false, error: unlocked.error };
  const secrets = await deriveSecrets(unlocked.ikm, "account", "0");
  unlocked.ikm.fill(0);
  if ("error" in secrets) return { ok: false, error: "This device cannot keep a key in the passkey." };
  return postPlayerSession(secrets);
}

export async function postPlayerSession(secrets: DeviceSecrets): Promise<{ ok: true; session: PlayerSession } | { ok: false; error: string }> {
  return readSession(await apiPost("/player/session", {}, () => ({ "x-player-auth": playerHeader(secrets, "/player/session") })));
}

export async function savePlayerName(secrets: DeviceSecrets, name: string): Promise<{ ok: true; session: PlayerSession } | { ok: false; error: string }> {
  return readSession(await apiPost("/player/name", { name }, () => ({ "x-player-auth": playerHeader(secrets, "/player/name") })));
}

export async function rollPlayerName(secrets: DeviceSecrets): Promise<{ ok: true; session: PlayerSession } | { ok: false; error: string }> {
  return readSession(await apiPost("/player/roll", {}, () => ({ "x-player-auth": playerHeader(secrets, "/player/roll") })));
}

export async function resumeRaid(secrets: DeviceSecrets, vaultId: string, round: string): Promise<string | null> {
  const result = await apiPost("/player/resume", { vaultId, round }, () => ({ "x-player-auth": playerHeader(secrets, "/player/resume") }));
  const body = result.ok && result.body && typeof result.body === "object" ? result.body as { blob?: unknown } : null;
  return typeof body?.blob === "string" && body.blob.length > 0 ? body.blob : null;
}

export function playerHeader(secrets: DeviceSecrets, route: string): string {
  const account = KeyPair.fromString(secrets.accountSecret as KeyPairString);
  const claim = KeyPair.fromString(secrets.claimSecret as KeyPairString);
  const seconds = Math.floor(Date.now() / 1000);
  const nonce = [...crypto.getRandomValues(new Uint8Array(8))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const message = new TextEncoder().encode(`bouncer.player.v1|${route}|${seconds}|${nonce}`);
  return [
    secrets.accountPublicKey,
    secrets.claimPublicKeyHex,
    String(seconds),
    nonce,
    bytesToBase64(account.sign(message).signature),
    bytesToBase64(claim.sign(message).signature),
  ].join("|");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function readSession(result: Awaited<ReturnType<typeof apiPost>>): { ok: true; session: PlayerSession } | { ok: false; error: string } {
  if (!result.ok) return { ok: false, error: result.error === "no server" ? "The player record is not connected." : "The player record could not be read." };
  const body = result.body as { ok?: unknown; error?: unknown; player?: PlayerSession["player"]; place?: unknown; line?: unknown; nights?: PlayerSession["nights"] } | null;
  if (!body || body.ok !== true || !body.player) {
    if (body?.error === "once") return { ok: false, error: "That name was already changed once." };
    if (body?.error === "taken") return { ok: false, error: "That name is already used." };
    if (body?.error === "name") return { ok: false, error: "Use 3 to 24 letters and numbers, and start with a letter." };
    if (body?.error === "record") return { ok: false, error: "The player record is not connected." };
    return { ok: false, error: "The player record could not be read." };
  }
  return { ok: true, session: { player: body.player, place: typeof body.place === "number" ? body.place : null, line: typeof body.line === "string" ? body.line : null, nights: body.nights ?? [] } };
}
