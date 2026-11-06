import assert from "node:assert/strict";
import test from "node:test";
import type { Rpc } from "./chain.ts";
import { frontDoor, readDoorIndex } from "./door-index.ts";

const key = Array.from({ length: 32 }, (_, i) => i);
const card = JSON.stringify({ v: 1, sign: "COASTLINE NIGHT", name: "Kwame", pitch: "We owe.", look: {} });
const row = (over: Record<string, unknown> = {}) => ({
  sponsor: "s.test", pot: "1", day_pot: "0", reserved: "0", cap: "1", lock_ns: "1", rule: "PayTheBill", guard_pk: key, commitment: null,
  guard_version: null, round: "1", opens_at: "0", closes_at: "9000000000000000000", open: true, challenge_end: null, max_cracks: 1, ticketed: false,
  closed_pending_bump: false, refund_in_flight: "0", crack_count: 0, spec_hash: null, card: null, suspended: false, ...over,
});

function rpcFor(table: Record<string, unknown>, seen: string[] = []): Rpc {
  return async (request) => {
    const params = request.params as { method_name: string; args_base64: string };
    const args = JSON.parse(Buffer.from(params.args_base64, "base64").toString("utf8")) as Record<string, unknown>;
    const keyName = params.method_name === "list_vaults" ? `list:${args.from_index}` : `get_vault:${args.vault_id}`;
    seen.push(keyName);
    return keyName in table ? { ok: true, value: table[keyName] } : { ok: false, error: "rpc" };
  };
}

test("listed doors keep creation order and their own card", async () => {
  const seen: string[] = [];
  const index = await readDoorIndex(rpcFor({
    "list:0": ["velvet-1", "qa-coast-05", "bad id"],
    "get_vault:velvet-1": row({ open: false }),
    "get_vault:qa-coast-05": row({ spec_hash: key, card }),
  }, seen), "vault.test", 0);
  assert.ok(index.ok);
  if (index.ok) {
    assert.equal(index.truncated, false);
    assert.deepEqual(index.doors.map((door) => [door.id, door.href, door.sign, door.name, door.line, door.sponsored]), [
      ["velvet-1", "/v/velvet-1", "velvet-1", "velvet-1", "Closed", false],
      ["qa-coast-05", "/v/qa-coast-05", "COASTLINE NIGHT", "Kwame", "Open", true],
    ]);
  }
  assert.equal(seen.includes("get_vault:bad id"), false);
});

test("a vault that does not read stays an id", async () => {
  const index = await readDoorIndex(rpcFor({
    "list:0": ["qa-coast-05"],
  }), "vault.test", 0);
  assert.ok(index.ok);
  if (index.ok) {
    assert.deepEqual(index.doors[0], {
      id: "qa-coast-05",
      href: "/v/qa-coast-05",
      sign: "qa-coast-05",
      name: "qa-coast-05",
      line: "Could not be read",
      shut: true,
      sponsored: false,
      read: false,
      card: null,
    });
  }
});

test("a suspended door says so before open or closed", async () => {
  const index = await readDoorIndex(rpcFor({
    "list:0": ["qa-coast-05"],
    "get_vault:qa-coast-05": row({ suspended: true }),
  }), "vault.test", 0);
  assert.ok(index.ok && index.doors[0]?.line === "Suspended" && index.doors[0]?.shut);
});

test("a failed list invents no doors", async () => {
  const index = await readDoorIndex(rpcFor({}), "vault.test", 0);
  assert.deepEqual(index, { ok: false });
});

test("a full page says the list stopped and does not read the next id", async () => {
  const ids = Array.from({ length: 100 }, (_, i) => `door-${i}`);
  const table: Record<string, unknown> = { "list:0": ids, "list:100": ["door-100"] };
  for (const id of ids) table[`get_vault:${id}`] = row();
  const seen: string[] = [];
  const index = await readDoorIndex(rpcFor(table, seen), "vault.test", 0);
  assert.ok(index.ok && index.truncated && index.doors.length === 100);
  assert.equal(seen.includes("get_vault:door-100"), false);
});

test("the front door is an open vault, not a configured id", () => {
  const closed = { id: "velvet-1", href: "/v/velvet-1", sign: "velvet-1", name: "velvet-1", line: "Closed", shut: true, sponsored: false, read: true, card: null };
  const open = { id: "qa-coast-05", href: "/v/qa-coast-05", sign: "COASTLINE NIGHT", name: "Kwame", line: "Open", shut: false, sponsored: true, read: true, card: null };
  const unread = { ...open, id: "miss", read: false, shut: true, line: "Could not be read" };
  assert.equal(frontDoor([closed, open])?.id, "qa-coast-05");
  assert.equal(frontDoor([open, closed])?.id, "qa-coast-05");
  assert.equal(frontDoor([closed, { ...closed, id: "later" }])?.id, "velvet-1");
  assert.equal(frontDoor([unread]), null);
  assert.equal(frontDoor([]), null);
});
