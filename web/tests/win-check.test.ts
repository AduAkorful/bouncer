import assert from "node:assert/strict";
import test from "node:test";
import { toHex, verdictBytes } from "../lib/verdict-check.ts";
import type { CrackView } from "../lib/vault.ts";
import { checkWin, crackKey, findBlockAt, fromBase64, parseRaidIndex, raidIndexPrefix, receiptVerdict, toBase64, type Call } from "../lib/win-check.ts";

const CONTRACT = "bouncer-vault.testnet";
const KEY = { vaultId: "jamestown-wharf-09", round: 1, raidId: "56c7799ce5686b88e127692d07ef3d5a" };
const bytes = (fill: number) => Array.from({ length: 32 }, () => fill);

function indexEntry(vaultId: string, round: number, index: number, raidId: string) {
  const prefix = fromBase64(raidIndexPrefix(vaultId))!;
  const key = new Uint8Array(prefix.length + 12);
  key.set(prefix);
  new DataView(key.buffer).setBigUint64(prefix.length, BigInt(round), true);
  new DataView(key.buffer).setUint32(prefix.length + 8, index, true);
  const id = new TextEncoder().encode(raidId);
  const value = new Uint8Array(4 + id.length);
  new DataView(value.buffer).setUint32(0, id.length, true);
  value.set(id, 4);
  return { key: toBase64(key), value: toBase64(value) };
}

test("the raid index lists every round's wins in order and drops rows that do not decode", () => {
  const rows = parseRaidIndex("koi", [
    indexEntry("koi", 2, 0, "raid-b"),
    indexEntry("koi", 1, 1, "raid-a2"),
    indexEntry("koi", 1, 0, "raid-a1"),
    indexEntry("koi-2", 1, 0, "other-vault"),
    { key: "!!", value: "!!" },
  ]);
  assert.deepEqual(
    rows.map((r) => [r.round, r.index, r.raidId]),
    [
      [1, 0, "raid-a1"],
      [1, 1, "raid-a2"],
      [2, 0, "raid-b"],
    ],
  );
});

test("the crack key is the Cracks prefix, then borsh of vault, round and raid", () => {
  const key = fromBase64(crackKey({ vaultId: "v", round: 3, raidId: "r" }))!;
  assert.deepEqual([...key], [1, 1, 0, 0, 0, 118, 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 114]);
});

async function signedWin() {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const guardPk = toHex(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const args = {
    verdict: {
      vault_id: KEY.vaultId,
      round: KEY.round,
      raid_id: KEY.raidId,
      player_id: "ab".repeat(32),
      bill_hash: bytes(1),
      amount: 3730000,
      claim_pk: bytes(2),
      conversation_hash: bytes(3),
      guard_version: bytes(4),
    },
    signature: [] as number[],
  };
  const hexed = { ...args.verdict, bill_hash: "01".repeat(32), claim_pk: "02".repeat(32), conversation_hash: "03".repeat(32), guard_version: "04".repeat(32), amount: "3730000" };
  const message = verdictBytes(hexed)!;
  args.signature = [...new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, new Uint8Array(message)))];
  const receipt = {
    receipt_id: "8oAmSbTMzy5STK8AaZFJt1f1w7STeWBYTVTT5Xzw6pJw",
    predecessor_id: "relay.aduakorful.testnet",
    receiver_id: CONTRACT,
    receipt: { Action: { actions: [{ FunctionCall: { method_name: "submit_verdict", args: toBase64(new TextEncoder().encode(JSON.stringify(args))) } }] } },
  };
  const crack: CrackView = {
    playerId: "ab".repeat(32),
    claimPk: "02".repeat(32),
    amount: "3730000",
    recordedAt: "1794334720572803648",
    unlockAt: "1794335320572803648",
    expiresAt: "1794939520572803648",
    status: "Reserved",
    billHash: "01".repeat(32),
    conversationHash: "03".repeat(32),
    guardVersion: "04".repeat(32),
  };
  return { guardPk, receipt, crack };
}

test("a submit_verdict receipt gives back the verdict in hex and its signature", async () => {
  const { receipt } = await signedWin();
  const read = receiptVerdict(receipt, CONTRACT)!;
  assert.equal(read.verdict.bill_hash, "01".repeat(32));
  assert.equal(read.verdict.amount, "3730000");
  assert.equal(read.signatureHex.length, 128);
  assert.equal(receiptVerdict(receipt, "another.testnet"), null);
  const other = structuredClone(receipt);
  other.receipt.Action.actions[0]!.FunctionCall.method_name = "claim";
  assert.equal(receiptVerdict(other, CONTRACT), null);
});

test("the block is found by exact timestamp, stepping over heights with no block", async () => {
  const target = 1_794_334_720_572_803_648n;
  // Blocks about 0.55 s apart; height 1000 holds the target; 999 and 1003 are missing.
  const at = (h: number) => (h === 999 || h === 1003 ? null : target + BigInt(h - 1000) * 550_000_000n);
  let calls = 0;
  const found = await findBlockAt(target, { height: 5000, timestamp: at(5000)! }, async (h) => {
    calls += 1;
    return at(h);
  });
  assert.equal(found, 1000);
  assert.ok(calls < 20, `took ${calls} calls`);
});

function fakeChain(receipt: unknown, opts: { changes?: boolean } = {}): Call {
  const recorded = 1_794_334_720_572_803_648n;
  const ts = (h: number) => recorded + BigInt(h - 1000) * 600_000_000n;
  return async (method, params) => {
    const p = params as Record<string, unknown>;
    if (method === "block" && p.finality) return { ok: true, result: { header: { height: 2000, timestamp_nanosec: ts(2000).toString() } } };
    if (method === "block") return { ok: true, result: { header: { timestamp_nanosec: ts(p.block_id as number).toString() } } };
    if (method === "EXPERIMENTAL_changes") {
      assert.equal(p.key_prefix_base64, crackKey(KEY));
      if (p.block_id !== 1000 || opts.changes === false) return { ok: true, result: { changes: [] } };
      return { ok: true, result: { changes: [{ cause: { type: "receipt_processing", receipt_hash: "8oAm" } }] } };
    }
    if (method === "EXPERIMENTAL_receipt") return { ok: true, result: receipt };
    return { ok: false, error: "rpc" };
  };
}

test("an honest win passes all four checks", async () => {
  const { guardPk, receipt, crack } = await signedWin();
  const result = await checkWin({ key: KEY, crack, guardPk, contractId: CONTRACT, call: fakeChain(receipt) });
  assert.deepEqual(result.rows.map((r) => [r.id, r.status]), [
    ["recorded", "ok"],
    ["receipt", "ok"],
    ["matches", "ok"],
    ["signature", "ok"],
  ]);
  assert.equal(result.block, 1000);
  assert.equal(result.predecessor, "relay.aduakorful.testnet");
});

test("a stored amount that differs from the signed one is called out", async () => {
  const { guardPk, receipt, crack } = await signedWin();
  const result = await checkWin({ key: KEY, crack: { ...crack, amount: "9999999" }, guardPk, contractId: CONTRACT, call: fakeChain(receipt) });
  const matches = result.rows.find((r) => r.id === "matches")!;
  assert.equal(matches.status, "bad");
  assert.match(matches.detail, /amount/);
});

test("another key's signature is not ticked", async () => {
  const { receipt, crack } = await signedWin();
  const other = await signedWin();
  const result = await checkWin({ key: KEY, crack, guardPk: other.guardPk, contractId: CONTRACT, call: fakeChain(receipt) });
  assert.equal(result.rows.find((r) => r.id === "signature")!.status, "bad");
});

test("a missing receipt leaves the later checks unchecked, never ticked", async () => {
  const { guardPk, receipt, crack } = await signedWin();
  const result = await checkWin({ key: KEY, crack, guardPk, contractId: CONTRACT, call: fakeChain(receipt, { changes: false }) });
  assert.deepEqual(
    result.rows.map((r) => r.status),
    ["ok", "unchecked", "unchecked", "unchecked"],
  );
});
