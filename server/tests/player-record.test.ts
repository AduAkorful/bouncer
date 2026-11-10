import assert from "node:assert/strict";
import test from "node:test";
import { KeyPair } from "near-api-js";
import { createPlayerAuth, playerChallenge } from "../src/player-auth.ts";
import { boardEntry, memoryPlayers, nextStreak, openSession, publicBoard, recordGotIn, recordOpen, recordTurn, renamePlayer, shownStreak, utcDay } from "../src/player-record.ts";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-11-01T12:00:00.000Z");

test("a streak adds one on the next UTC day and returns to zero after a missed day", () => {
  assert.deepEqual(nextStreak(0, null, "2026-11-01"), { streak: 1, lastDay: "2026-11-01" });
  assert.deepEqual(nextStreak(1, "2026-11-01", "2026-11-01"), { streak: 1, lastDay: "2026-11-01" });
  assert.deepEqual(nextStreak(1, "2026-11-01", "2026-11-02"), { streak: 2, lastDay: "2026-11-02" });
  assert.equal(shownStreak(2, "2026-11-02", "2026-11-04"), 0);
  assert.deepEqual(nextStreak(2, "2026-11-02", "2026-11-04"), { streak: 1, lastDay: "2026-11-04" });
});

test("the first sign-in keeps the name, and a second rename is refused", async () => {
  const store = memoryPlayers();
  const keys = pair();
  const opened = await openSession(store, { ...keys, now: START, random: () => 0 });
  assert.equal(opened.ok && opened.player.name, "QuietOkada2");
  const again = await openSession(store, { ...keys, now: START + DAY });
  assert.equal(again.ok && again.player.name, "QuietOkada2");
  const renamed = await renamePlayer(store, keys.publicKey, "LateLamp7");
  assert.equal(renamed.ok && renamed.player.renameUsed, true);
  assert.equal((await renamePlayer(store, keys.publicKey, "BoldDoor8")).ok, false);
});

test("a taken name is refused", async () => {
  const store = memoryPlayers();
  const first = pair();
  const second = pair();
  await openSession(store, { ...first, now: START, random: () => 0 });
  await openSession(store, { ...second, now: START, random: () => 0.5 });
  assert.equal((await renamePlayer(store, second.publicKey, "QuietOkada2")).ok, false);
});

test("a night without a signed-in player does not move the board", async () => {
  const store = memoryPlayers();
  await recordOpen(store, { claimKey: "ab".repeat(32), vaultId: "door", round: "1", blob: "sealed", now: START });
  await recordGotIn(store, { claimKey: "ab".repeat(32), vaultId: "door", round: "1", now: START });
  assert.deepEqual(await store.allPlayers(), []);
});

test("getting in counts once, and the share line has no bill", async () => {
  const store = memoryPlayers();
  const keys = pair();
  await openSession(store, { ...keys, now: START, random: () => 0 });
  await recordOpen(store, { claimKey: keys.claimKey, vaultId: "door", round: "1", blob: "sealed", now: START });
  await recordGotIn(store, { claimKey: keys.claimKey, vaultId: "door", round: "1", now: START });
  await recordGotIn(store, { claimKey: keys.claimKey, vaultId: "door", round: "1", now: START });
  const board = publicBoard(await store.allPlayers(), utcDay(START));
  assert.equal(board[0]?.nights, 1);
  assert.equal(board[0]?.line.includes("bill"), false);
  assert.equal(board[0]?.line.includes("amount"), false);
  assert.match(board[0]?.line ?? "", /1st on Bouncer/);
  assert.equal(await store.readBlob(keys.claimKey, "door", "1"), "sealed");
});

test("the same passkey signature opens the same player", () => {
  const account = KeyPair.fromRandom("ed25519");
  const claim = KeyPair.fromRandom("ed25519");
  const claimKey = Buffer.from(claim.getPublicKey().data).toString("hex");
  const seconds = 1_700_000_000;
  const nonce = "0011223344556677";
  const message = playerChallenge("/player/session", seconds, nonce);
  const header = [
    account.getPublicKey().toString(),
    claimKey,
    String(seconds),
    nonce,
    Buffer.from(account.sign(message).signature).toString("base64"),
    Buffer.from(claim.sign(message).signature).toString("base64"),
  ].join("|");
  const auth = createPlayerAuth(() => seconds * 1000);
  const first = auth(header, "/player/session");
  const second = auth(header, "/player/session");
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
});

function pair(): { publicKey: string; claimKey: string } {
  const account = KeyPair.fromRandom("ed25519");
  const claim = KeyPair.fromRandom("ed25519");
  return { publicKey: account.getPublicKey().toString(), claimKey: Buffer.from(claim.getPublicKey().data).toString("hex") };
}

test("the board lists only players who opened a raid, and level players share a place", () => {
  const row = (name: string, nightsIn: number, streak: number, lastDay: string | null, created: string) =>
    ({ publicKey: "", claimKey: "", name, renameUsed: false, streak, lastDay, nightsIn, created });
  const today = "2026-11-09";
  const board = publicBoard([
    row("Quiet1", 0, 0, null, "2026-11-01"),
    row("Alpha", 0, 1, today, "2026-11-02"),
    row("Bravo", 0, 1, today, "2026-11-03"),
    row("Charlie", 2, 1, today, "2026-11-04"),
    row("Delta", 0, 0, "2026-11-01", "2026-11-05"),
  ], today);
  assert.deepEqual(board.map((p) => [p.name, p.place]), [["Charlie", 1], ["Alpha", 2], ["Bravo", 2], ["Delta", 4]]);
  assert.equal(boardEntry(board, "ALPHA")?.name, "Alpha");
  assert.equal(boardEntry(board, "quiet1"), null);
  assert.match(board[1].line, /2nd on Bouncer · 0 nights in · 1-day streak/);
});

test("a later turn replaces the stored blob, so another device resumes where this one stopped", async () => {
  const store = memoryPlayers();
  const keys = pair();
  await openSession(store, { ...keys, now: START, random: () => 0 });
  await recordOpen(store, { claimKey: keys.claimKey, vaultId: "door", round: "1", blob: "first", now: START });
  await recordTurn(store, { claimKey: keys.claimKey, vaultId: "door", round: "1", blob: "third" });
  assert.equal(await store.readBlob(keys.claimKey, "door", "1"), "third");
  // A turn for a player with no record stores nothing.
  await recordTurn(store, { claimKey: "cd".repeat(32), vaultId: "door", round: "1", blob: "x" });
  assert.equal(await store.readBlob("cd".repeat(32), "door", "1"), null);
});

test("the weekly board ranks the last seven days only, and a new player can place", async () => {
  const { weeklyBoard, weekStart } = await import("../src/player-record.ts");
  const today = "2026-11-10";
  assert.equal(weekStart(today), "2026-11-04");
  const mk = (n: string, created: string, streak: number, lastDay: string, nightsIn: number) => ({ publicKey: n, claimKey: n.repeat(64).slice(0, 64), name: n, renameUsed: false, streak, lastDay, nightsIn, created });
  const old = mk("a", "2026-10-01", 1, "2026-11-10", 9);
  const fresh = mk("b", "2026-11-09", 2, "2026-11-10", 1);
  const idle = mk("c", "2026-10-02", 0, "2026-10-20", 4);
  const night = (p: ReturnType<typeof mk>, day: string, state: "opened" | "in") => ({ claimKey: p.claimKey, vaultId: "door", round: "1", state, day });
  const board = weeklyBoard([old, fresh, idle], [night(old, "2026-11-10", "opened"), night(old, "2026-10-30", "in"), night(fresh, "2026-11-09", "in"), night(idle, "2026-10-20", "in")], today);
  // The all-time leader won nothing this week, so the new player leads; the idle player is not listed.
  assert.deepEqual(board.map((row) => [row.name, row.place, row.nights]), [["b", 1, 1], ["a", 2, 0]]);
});
