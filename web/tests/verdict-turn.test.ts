import assert from "node:assert/strict";
import test from "node:test";
import { readDoor, type Rpc } from "../lib/chain.ts";
import { submissionAllowed, parseVerdictSubmission } from "../lib/verdict-turn.ts";

function rpcBytes(value: unknown): Rpc {
  const bytes = [...Buffer.from(JSON.stringify(value))];
  return async () => ({ ok: true, value: JSON.parse(Buffer.from(bytes).toString("utf8")) });
}

test("a missing vault does not become a submission", async () => {
  const rpc: Rpc = async (request) => {
    if (request.params.method_name === "get_vault") return { ok: true, value: null };
    return { ok: false, error: "rpc" };
  };
  const door = await readDoor(rpc, "vault.testnet", "velvet-1");
  assert.deepEqual(door, { ok: false, error: "missing vault" });
});

test("an rpc error does not become a submission", async () => {
  const rpc: Rpc = async () => ({ ok: false, error: "rpc" });
  const door = await readDoor(rpc, "vault.testnet", "velvet-1");
  assert.equal(door.ok, false);
});

test("a ticketed door is not submitted", async () => {
  let calls = 0;
  const vault = {
    sponsor: "sponsor.testnet",
    pot: "0",
    day_pot: "1",
    reserved: "0",
    cap: "1",
    lock_ns: "1",
    rule: "PayTheBill",
    guard_pk: Array.from({ length: 32 }, () => 1),
    commitment: Array.from({ length: 32 }, () => 2),
    guard_version: Array.from({ length: 32 }, () => 3),
    round: "4",
    opens_at: "1",
    closes_at: "2",
    open: true,
    challenge_end: null,
    max_cracks: 1,
    ticketed: true,
    closed_pending_bump: false,
    refund_in_flight: "0",
    crack_count: 0,
  };
  const rpc: Rpc = async (request) => {
    calls += 1;
    if (request.params.method_name === "get_vault") return rpcBytes(vault)(request);
    return rpcBytes("owner.testnet")(request);
  };
  const door = await readDoor(rpc, "vault.testnet", "velvet-1");
  assert.equal(door.ok, true);
  if (!door.ok) return;
  const verdict = parseVerdictSubmission({
    verdict: {
      vault_id: "velvet-1",
      round: "4",
      raid_id: "raid-1",
      player_id: "player-1",
      bill_hash: Array.from({ length: 32 }, () => 9),
      amount: "10",
      claim_pk: Array.from({ length: 32 }, () => 8),
      conversation_hash: Array.from({ length: 32 }, () => 7),
      guard_version: Array.from({ length: 32 }, () => 6),
    },
    signature: Array.from({ length: 64 }, () => 5),
  });
  assert.equal(verdict.ok, true);
  if (!verdict.ok) return;
  assert.equal(submissionAllowed(door.vault, door.owner, "relay.testnet", verdict.verdict, "velvet-1").ok, false);
  assert.equal(calls, 2);
});
