import assert from "node:assert/strict";
import test from "node:test";
import { playerDbUrl } from "../src/player-db.ts";

test("the player record uses the HTTPS engine", () => {
  assert.equal(playerDbUrl("wss://db.example"), "https://db.example");
  assert.equal(playerDbUrl("https://db.example"), "https://db.example");
});
