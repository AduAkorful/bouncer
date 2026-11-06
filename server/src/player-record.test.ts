import assert from "node:assert/strict";
import test from "node:test";
import { KeyPair } from "near-api-js";
import { createPlayerAuth, playerChallenge } from "./player-auth.ts";
import { memoryPlayers, nextStreak, openSession, publicBoard, recordGotIn, recordOpen, renamePlayer, shownStreak, utcDay } from "./player-record.ts";

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
