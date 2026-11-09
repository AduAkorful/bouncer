/** The player record. The phone proves the passkey. This module never sees the private key. */

import { generatedPlayerName, playerNameToStore } from "../../web/lib/player-name.ts";

export type PlayerRow = {
  publicKey: string;
  claimKey: string;
  name: string;
  renameUsed: boolean;
  streak: number;
  lastDay: string | null;
  nightsIn: number;
  created: string;
};

export type NightRow = {
  claimKey: string;
  vaultId: string;
  round: string;
  state: "opened" | "in";
  day: string;
};

export type PlayerStore = {
  findByAccount(publicKey: string): Promise<PlayerRow | null>;
  findByClaim(claimKey: string): Promise<PlayerRow | null>;
  findByName(name: string): Promise<PlayerRow | null>;
  insert(row: PlayerRow): Promise<void>;
  save(row: PlayerRow): Promise<void>;
  nightsFor(claimKey: string): Promise<NightRow[]>;
  saveNight(night: NightRow): Promise<void>;
  readBlob(claimKey: string, vaultId: string, round: string): Promise<string | null>;
  saveBlob(claimKey: string, vaultId: string, round: string, blob: string): Promise<void>;
  allPlayers(): Promise<PlayerRow[]>;
};

export type PublicPlayer = {
  name: string;
  place: number;
  nights: number;
  streak: number;
  line: string;
};

const CLAIM = /^[0-9a-f]{64}$/;
const ACCOUNT = /^ed25519:[1-9A-HJ-NP-Za-km-z]+$/;

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function previousUtcDay(day: string): string {
  const ms = Date.parse(`${day}T00:00:00.000Z`);
  return utcDay(ms - 24 * 60 * 60 * 1000);
}

/** A missed UTC day shows zero. The same day and the next day keep the count. */
export function shownStreak(streak: number, lastDay: string | null, today: string): number {
  if (!lastDay || streak < 1) return 0;
  if (lastDay === today || lastDay === previousUtcDay(today)) return streak;
  return 0;
}

/** Opening a raid on a new UTC day moves the streak. The same day does not add another. */
export function nextStreak(streak: number, lastDay: string | null, today: string): { streak: number; lastDay: string } {
  const visible = shownStreak(streak, lastDay, today);
  if (lastDay === today) return { streak: visible, lastDay: today };
  return { streak: visible + 1, lastDay: today };
}

export function shareLine(name: string, place: number, nights: number, streak: number): string {
  return `${name} · ${ordinal(place)} on Bouncer · ${nights} ${nights === 1 ? "night" : "nights"} in · ${streak}-day streak`;
}

/** How the board is ordered, in the words the board shows. */
export const BOARD_RULE = "Ranked by nights in, then by streak. Players level on both share a place.";

/**
 * Only players who have opened a raid are on the board; an account alone does not put a name there.
 * Players level on nights and streak share a place (1, 1, 3), and are listed oldest account first.
 */
export function publicBoard(players: PlayerRow[], today: string): PublicPlayer[] {
  const played = players.filter((player) => player.lastDay !== null || player.nightsIn > 0);
  const ranked = [...played].sort((a, b) => {
    if (b.nightsIn !== a.nightsIn) return b.nightsIn - a.nightsIn;
    const streak = shownStreak(b.streak, b.lastDay, today) - shownStreak(a.streak, a.lastDay, today);
    if (streak !== 0) return streak;
    return a.created < b.created ? -1 : a.created > b.created ? 1 : 0;
  });
  let place = 0;
  let previous: { nights: number; streak: number } | null = null;
  return ranked.map((player, index) => {
    const streak = shownStreak(player.streak, player.lastDay, today);
    if (!previous || previous.nights !== player.nightsIn || previous.streak !== streak) place = index + 1;
    previous = { nights: player.nightsIn, streak };
    return { name: player.name, place, nights: player.nightsIn, streak, line: shareLine(player.name, place, player.nightsIn, streak) };
  });
}

/** One name on the board, matched without regard to letter case, since the board draws names in capitals. */
export function boardEntry(board: PublicPlayer[], name: string): PublicPlayer | null {
  const wanted = name.trim().toLowerCase();
  return board.find((entry) => entry.name.toLowerCase() === wanted) ?? null;
}

export async function openSession(store: PlayerStore, input: { publicKey: string; claimKey: string; now: number; random?: () => number }): Promise<{ ok: true; player: PlayerRow; nights: NightRow[] } | { ok: false; error: string }> {
  if (!ACCOUNT.test(input.publicKey) || !CLAIM.test(input.claimKey)) return { ok: false, error: "key" };
  const existing = await store.findByAccount(input.publicKey);
  if (existing) {
    if (existing.claimKey !== input.claimKey) return { ok: false, error: "key" };
    return { ok: true, player: existing, nights: await store.nightsFor(input.claimKey) };
  }
  const claimOwner = await store.findByClaim(input.claimKey);
  if (claimOwner) return { ok: false, error: "key" };
  const name = await freshName(store, input.random ?? Math.random);
  const row: PlayerRow = {
    publicKey: input.publicKey,
    claimKey: input.claimKey,
    name,
    renameUsed: false,
    streak: 0,
    lastDay: null,
    nightsIn: 0,
    created: new Date(input.now).toISOString(),
  };
  await store.insert(row);
  return { ok: true, player: row, nights: [] };
}

export async function rollName(store: PlayerStore, publicKey: string, random: () => number = Math.random): Promise<{ ok: true; player: PlayerRow } | { ok: false; error: string }> {
  const player = await store.findByAccount(publicKey);
  if (!player) return { ok: false, error: "name" };
  if (player.renameUsed) return { ok: false, error: "once" };
  const name = await freshName(store, random);
  const saved = { ...player, name, renameUsed: false };
  await store.save(saved);
  return { ok: true, player: saved };
}

export async function renamePlayer(store: PlayerStore, publicKey: string, name: string): Promise<{ ok: true; player: PlayerRow } | { ok: false; error: string }> {
  const next = playerNameToStore(name);
  const player = await store.findByAccount(publicKey);
  if (!next || !player) return { ok: false, error: "name" };
  if (player.renameUsed) return { ok: false, error: "once" };
  if (next === player.name) return { ok: true, player };
  const taken = await store.findByName(next);
  if (taken && taken.publicKey !== player.publicKey) return { ok: false, error: "taken" };
  const saved = { ...player, name: next, renameUsed: true };
  await store.save(saved);
  return { ok: true, player: saved };
}

export async function recordOpen(store: PlayerStore, input: { claimKey: string; vaultId: string; round: string; blob: string; now: number }): Promise<void> {
  if (!CLAIM.test(input.claimKey) || !input.vaultId || !/^[0-9]+$/.test(input.round) || input.blob.length === 0) return;
  const player = await store.findByClaim(input.claimKey);
  if (!player) return;
  const today = utcDay(input.now);
  const stepped = nextStreak(player.streak, player.lastDay, today);
  await store.save({ ...player, streak: stepped.streak, lastDay: stepped.lastDay });
  const nights = await store.nightsFor(input.claimKey);
  const prior = nights.find((night) => night.vaultId === input.vaultId && night.round === input.round);
  await store.saveNight({ claimKey: input.claimKey, vaultId: input.vaultId, round: input.round, state: prior?.state === "in" ? "in" : "opened", day: prior?.day ?? today });
  await store.saveBlob(input.claimKey, input.vaultId, input.round, input.blob);
}

export async function recordGotIn(store: PlayerStore, input: { claimKey: string; vaultId: string; round: string; now: number }): Promise<void> {
  if (!CLAIM.test(input.claimKey) || !input.vaultId || !/^[0-9]+$/.test(input.round)) return;
  const player = await store.findByClaim(input.claimKey);
  if (!player) return;
  const nights = await store.nightsFor(input.claimKey);
  const prior = nights.find((night) => night.vaultId === input.vaultId && night.round === input.round);
  if (prior?.state === "in") return;
  const today = utcDay(input.now);
  await store.saveNight({ claimKey: input.claimKey, vaultId: input.vaultId, round: input.round, state: "in", day: prior?.day ?? today });
  const stepped = nextStreak(player.streak, player.lastDay, today);
  await store.save({ ...player, nightsIn: player.nightsIn + 1, streak: prior ? player.streak : stepped.streak, lastDay: prior ? player.lastDay : stepped.lastDay });
}

export function viewOf(player: PlayerRow, today: string): { name: string; renameUsed: boolean; streak: number; nights: number; created: string } {
  return { name: player.name, renameUsed: player.renameUsed, streak: shownStreak(player.streak, player.lastDay, today), nights: player.nightsIn, created: player.created };
}

async function freshName(store: PlayerStore, random: () => number): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const name = generatedPlayerName(random);
    if (!(await store.findByName(name))) return name;
  }
  return `${generatedPlayerName(random)}${Math.floor(random() * 1000)}`;
}

function ordinal(place: number): string {
  const teen = place % 100;
  if (teen >= 11 && teen <= 13) return `${place}th`;
  const last = place % 10;
  if (last === 1) return `${place}st`;
  if (last === 2) return `${place}nd`;
  if (last === 3) return `${place}rd`;
  return `${place}th`;
}

export function memoryPlayers(): PlayerStore {
  const players: PlayerRow[] = [];
  const nights: NightRow[] = [];
  const blobs = new Map<string, string>();
  return {
    async findByAccount(publicKey) { return players.find((player) => player.publicKey === publicKey) ?? null; },
    async findByClaim(claimKey) { return players.find((player) => player.claimKey === claimKey) ?? null; },
    async findByName(name) { return players.find((player) => player.name === name) ?? null; },
    async insert(row) { players.push({ ...row }); },
    async save(row) {
      const index = players.findIndex((player) => player.publicKey === row.publicKey);
      if (index >= 0) players[index] = { ...row };
    },
    async nightsFor(claimKey) { return nights.filter((night) => night.claimKey === claimKey).map((night) => ({ ...night })); },
    async saveNight(night) {
      const index = nights.findIndex((row) => row.claimKey === night.claimKey && row.vaultId === night.vaultId && row.round === night.round);
      if (index >= 0) nights[index] = { ...night };
      else nights.push({ ...night });
    },
    async readBlob(claimKey, vaultId, round) { return blobs.get(`${claimKey}|${vaultId}|${round}`) ?? null; },
    async saveBlob(claimKey, vaultId, round, blob) { blobs.set(`${claimKey}|${vaultId}|${round}`, blob); },
    async allPlayers() { return players.map((player) => ({ ...player })); },
  };
}
