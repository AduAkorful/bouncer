import { fromHex, toHex, verifyVerdict } from "./verdict-check.ts";
import type { CrackView } from "./vault.ts";
import { quoteUnsafeIntegers } from "./vault.ts";

/**
 * Plan 82. Checks a recorded win from public chain data alone. The vault keeps every field of the signed
 * verdict on the crack but not the signature, so the signature is read back from the `submit_verdict`
 * receipt that recorded it: find the block by the crack's `recorded_at`, ask which receipt wrote the crack's
 * storage key in that block, and read that receipt's arguments.
 */

export type WinKey = { vaultId: string; round: number; raidId: string };
export type WinRow = { vaultId: string; round: number; index: number; raidId: string };

// Storage prefixes are the borsh index of the vault's `StorageKey` variant (contracts/vault/src/state.rs).
const CRACKS = 1;
const RAID_INDEX = 6;

const enc = new TextEncoder();
const dec = new TextDecoder();

function u32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n, true);
  return out;
}

function u64(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, n, true);
  return out;
}

function str(value: string): Uint8Array {
  const bytes = enc.encode(value);
  return concat([u32(bytes.length), bytes]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

export function fromBase64(text: string): Uint8Array | null {
  try {
    const raw = atob(text);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** `view_state` prefix for every win this vault has recorded, all rounds. */
export function raidIndexPrefix(vaultId: string): string {
  return toBase64(concat([Uint8Array.of(RAID_INDEX), str(vaultId)]));
}

/** The storage key `submit_verdict` writes for this win. */
export function crackKey(key: WinKey): string {
  return toBase64(concat([Uint8Array.of(CRACKS), str(key.vaultId), u64(BigInt(key.round)), str(key.raidId)]));
}

const RAID_ID = /^[A-Za-z0-9._-]{1,64}$/;

/** Rows of `view_state` under the raid-index prefix, oldest round first. A row that does not decode is dropped. */
export function parseRaidIndex(vaultId: string, values: unknown): WinRow[] {
  if (!Array.isArray(values)) return [];
  const head = concat([Uint8Array.of(RAID_INDEX), str(vaultId)]);
  const rows: WinRow[] = [];
  for (const item of values) {
    const key = fromBase64(String((item as { key?: unknown })?.key ?? ""));
    const value = fromBase64(String((item as { value?: unknown })?.value ?? ""));
    if (!key || !value || key.length !== head.length + 12 || !head.every((b, i) => key[i] === b)) continue;
    const view = new DataView(key.buffer, key.byteOffset);
    const round = view.getBigUint64(head.length, true);
    const index = view.getUint32(head.length + 8, true);
    if (value.length < 4) continue;
    const len = new DataView(value.buffer, value.byteOffset).getUint32(0, true);
    if (value.length !== 4 + len) continue;
    const raidId = dec.decode(value.subarray(4));
    if (round > BigInt(Number.MAX_SAFE_INTEGER) || !RAID_ID.test(raidId)) continue;
    rows.push({ vaultId, round: Number(round), index, raidId });
  }
  return rows.sort((a, b) => a.round - b.round || a.index - b.index);
}

function bytesHex(value: unknown): string | null {
  if (!Array.isArray(value) || value.length !== 32) return null;
  if (value.some((b) => typeof b !== "number" || !Number.isInteger(b) || b < 0 || b > 255)) return null;
  return toHex(Uint8Array.from(value as number[]));
}

export type ReceiptVerdict = {
  receiptId: string;
  predecessor: string;
  /** In the shape `verifyVerdict` reads: hashes as hex, the amount as a decimal string. */
  verdict: Record<string, unknown>;
  signatureHex: string;
};

/** The verdict and signature inside an `EXPERIMENTAL_receipt` result, or null if it is not a `submit_verdict` on this contract. */
export function receiptVerdict(result: unknown, contractId: string): ReceiptVerdict | null {
  const row = result as { receipt_id?: unknown; predecessor_id?: unknown; receiver_id?: unknown; receipt?: { Action?: { actions?: unknown[] } } } | null;
  if (!row || row.receiver_id !== contractId || typeof row.predecessor_id !== "string" || typeof row.receipt_id !== "string") return null;
  const call = (row.receipt?.Action?.actions?.[0] as { FunctionCall?: { method_name?: unknown; args?: unknown } } | undefined)?.FunctionCall;
  if (!call || call.method_name !== "submit_verdict" || typeof call.args !== "string") return null;
  const raw = fromBase64(call.args);
  if (!raw) return null;
  let args: { verdict?: Record<string, unknown>; signature?: unknown };
  try {
    args = JSON.parse(quoteUnsafeIntegers(dec.decode(raw)));
  } catch {
    return null;
  }
  const v = args.verdict;
  const sig = args.signature;
  if (!v || !Array.isArray(sig) || sig.length !== 64 || sig.some((b) => typeof b !== "number" || b < 0 || b > 255)) return null;
  const verdict = {
    vault_id: v.vault_id,
    round: v.round,
    raid_id: v.raid_id,
    player_id: v.player_id,
    bill_hash: bytesHex(v.bill_hash),
    amount: typeof v.amount === "number" || typeof v.amount === "string" ? String(v.amount) : null,
    claim_pk: bytesHex(v.claim_pk),
    conversation_hash: bytesHex(v.conversation_hash),
    guard_version: bytesHex(v.guard_version),
  };
  return { receiptId: row.receipt_id, predecessor: row.predecessor_id, verdict, signatureHex: toHex(Uint8Array.from(sig as number[])) };
}

/** Field names where the signed verdict and the vault's crack disagree. Empty means the vault holds what was signed. */
export function mismatches(key: WinKey, verdict: Record<string, unknown>, crack: CrackView): string[] {
  const want: Record<string, unknown> = {
    vault_id: key.vaultId,
    round: String(key.round),
    raid_id: key.raidId,
    player_id: crack.playerId,
    bill_hash: crack.billHash,
    amount: crack.amount,
    claim_pk: crack.claimPk,
    conversation_hash: crack.conversationHash,
    guard_version: crack.guardVersion,
  };
  return Object.keys(want).filter((field) => want[field] === null || String(verdict[field]) !== String(want[field]));
}

/**
 * The height whose block timestamp is exactly `target`, or null. Starts from an estimate at about 0.6 s a
 * block, jumps by the time still to cover, then walks one block at a time. A block the node cannot return
 * (pruned or skipped) is stepped over.
 */
export async function findBlockAt(
  target: bigint,
  head: { height: number; timestamp: bigint },
  timestampAt: (height: number) => Promise<bigint | null>,
  budget = 60,
): Promise<number | null> {
  const SECONDS_PER_BLOCK = 0.6;
  const behind = Number((head.timestamp - target) / 1_000_000n) / 1000;
  let height = Math.round(head.height - behind / SECONDS_PER_BLOCK);
  let last: bigint | null = null;
  for (let calls = 0; calls < budget && height > 0 && height <= head.height; calls++) {
    const at = await timestampAt(height);
    if (at === null) {
      height += last !== null && last > target ? -1 : 1;
      continue;
    }
    if (at === target) return height;
    const gap = Number((target - at) / 1_000_000n) / 1000;
    const jump = Math.round(gap / SECONDS_PER_BLOCK);
    const crossed = last !== null && (last < target) !== (at < target);
    height += crossed || Math.abs(jump) <= 2 ? Math.sign(gap) : jump;
    last = at;
  }
  return null;
}

export type Call = (method: string, params: unknown) => Promise<{ ok: true; result: unknown } | { ok: false; error: string }>;

export type Status = "ok" | "bad" | "unchecked";
export type CheckRow = { id: "recorded" | "receipt" | "matches" | "signature"; status: Status; detail: string };
export type WinCheck = { rows: CheckRow[]; block: number | null; receiptId: string | null; predecessor: string | null };

/**
 * Runs the four checks. `crack` and `guardPk` come from the vault views; everything else is read here.
 * A step that cannot be done leaves its row and every later row "unchecked", never "ok".
 */
export async function checkWin(input: { key: WinKey; crack: CrackView; guardPk: string | null; contractId: string; call: Call }): Promise<WinCheck> {
  const { key, crack, guardPk, contractId, call } = input;
  const rows: CheckRow[] = [{ id: "recorded", status: "ok", detail: `The vault holds this win: ${crack.status}.` }];
  const out: WinCheck = { rows, block: null, receiptId: null, predecessor: null };
  const rest = (detail: string) => {
    for (const id of ["receipt", "matches", "signature"] as const) {
      if (!rows.some((r) => r.id === id)) rows.push({ id, status: "unchecked", detail: id === "receipt" ? detail : "Needs the receipt above." });
    }
    return out;
  };

  const final = await call("block", { finality: "final" });
  const header = final.ok ? (final.result as { header?: { height?: unknown; timestamp_nanosec?: unknown } }).header : null;
  if (!header || typeof header.height !== "number" || typeof header.timestamp_nanosec !== "string") return rest("The node did not answer.");
  const timestampAt = async (height: number) => {
    const block = await call("block", { block_id: height });
    const ts = block.ok ? (block.result as { header?: { timestamp_nanosec?: unknown } }).header?.timestamp_nanosec : null;
    return typeof ts === "string" && /^[0-9]+$/.test(ts) ? BigInt(ts) : null;
  };
  const block = await findBlockAt(BigInt(crack.recordedAt), { height: header.height, timestamp: BigInt(header.timestamp_nanosec) }, timestampAt);
  if (block === null) return rest("The block that recorded this win could not be found. The node may no longer keep it.");
  out.block = block;

  const changes = await call("EXPERIMENTAL_changes", { block_id: block, changes_type: "data_changes", account_ids: [contractId], key_prefix_base64: crackKey(key) });
  const cause = changes.ok
    ? ((changes.result as { changes?: { cause?: { type?: unknown; receipt_hash?: unknown } }[] }).changes ?? []).map((c) => c.cause).find((c) => c?.type === "receipt_processing")
    : undefined;
  if (typeof cause?.receipt_hash !== "string") return rest("The node did not say which receipt wrote this win.");

  const receipt = await call("EXPERIMENTAL_receipt", { receipt_id: cause.receipt_hash });
  const signed = receipt.ok ? receiptVerdict(receipt.result, contractId) : null;
  if (!signed) return rest("The receipt that wrote this win could not be read.");
  out.receiptId = signed.receiptId;
  out.predecessor = signed.predecessor;
  rows.push({ id: "receipt", status: "ok", detail: `Found the submit_verdict call, sent by ${signed.predecessor}.` });

  const off = mismatches(key, signed.verdict, crack);
  rows.push(
    off.length === 0
      ? { id: "matches", status: "ok", detail: "Every signed field equals what the vault stored." }
      : { id: "matches", status: "bad", detail: `These fields differ: ${off.join(", ")}.` },
  );

  const valid = guardPk && fromHex(guardPk) ? await verifyVerdict(signed.verdict, signed.signatureHex, guardPk) : null;
  rows.push(
    valid === true
      ? { id: "signature", status: "ok", detail: "The signature is the guard key's. Checked in this browser." }
      : valid === false
        ? { id: "signature", status: "bad", detail: "The signature does not match the guard key this vault holds now." }
        : { id: "signature", status: "unchecked", detail: guardPk ? "This browser cannot check Ed25519 signatures." : "The vault has no guard key to check against." },
  );
  return out;
}

/** A JSON-RPC caller over fetch. Each method is tried on `primary`, then on `archival` when the first one fails. */
export function rpcCaller(primary: string, archival: string | null, fetchImpl: typeof fetch = fetch, timeoutMs = 10_000): Call {
  async function once(url: string, method: string, params: unknown) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "win", method, params }),
        signal: controller.signal,
      });
      const body = (await response.json()) as { result?: unknown; error?: unknown };
      return body.result !== undefined && !body.error ? { ok: true as const, result: body.result } : { ok: false as const, error: "rpc" };
    } catch {
      return { ok: false as const, error: "rpc" };
    } finally {
      clearTimeout(timer);
    }
  }
  return async (method, params) => {
    const first = await once(primary, method, params);
    if (first.ok || !archival || archival === primary) return first;
    return once(archival, method, params);
  };
}

/** A contract view through `call`, with long integers kept as strings. */
export async function viewCall(call: Call, contractId: string, method: string, args: Record<string, unknown>): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const answer = await call("query", {
    request_type: "call_function",
    finality: "final",
    account_id: contractId,
    method_name: method,
    args_base64: toBase64(enc.encode(JSON.stringify(args))),
  });
  const raw = answer.ok ? (answer.result as { result?: unknown }).result : null;
  if (!Array.isArray(raw) || raw.some((b) => typeof b !== "number" || b < 0 || b > 255)) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(quoteUnsafeIntegers(dec.decode(Uint8Array.from(raw as number[])))) };
  } catch {
    return { ok: false };
  }
}

/** Every win this vault has recorded, read from its raid index. */
export async function listWins(call: Call, contractId: string, vaultId: string): Promise<{ ok: true; wins: WinRow[] } | { ok: false }> {
  const answer = await call("query", { request_type: "view_state", finality: "final", account_id: contractId, prefix_base64: raidIndexPrefix(vaultId) });
  if (!answer.ok) return { ok: false };
  return { ok: true, wins: parseRaidIndex(vaultId, (answer.result as { values?: unknown }).values) };
}
