/**
 * Checks, in this browser, that a verdict was signed by the guard key the vault holds. The bytes are the ones
 * the vault builds: a domain, then borsh of the verdict fields.
 */

const DOMAIN = "bouncer.verdict.v1";
const HEX32 = /^[0-9a-f]{64}$/;

const enc = new TextEncoder();

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

function u128(n: bigint): Uint8Array {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, n & 0xffffffffffffffffn, true);
  view.setBigUint64(8, n >> 64n, true);
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

export function fromHex(text: string): Uint8Array | null {
  if (text.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(text)) return null;
  const out = new Uint8Array(text.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** The signed bytes of a verdict as the guard wrote it, or null when a field is missing or malformed. */
export function verdictBytes(verdict: Record<string, unknown>): Uint8Array | null {
  const text = (k: string) => (typeof verdict[k] === "string" ? (verdict[k] as string) : null);
  const key32 = (k: string) => {
    const v = text(k);
    return v && HEX32.test(v) ? fromHex(v) : null;
  };
  const vaultId = text("vault_id");
  const raidId = text("raid_id");
  const playerId = text("player_id");
  const round = verdict.round;
  const amount = text("amount");
  const bill = key32("bill_hash");
  const claim = key32("claim_pk");
  const convo = key32("conversation_hash");
  const version = key32("guard_version");
  if (!vaultId || !raidId || !playerId || !amount || !/^[0-9]+$/.test(amount)) return null;
  if (typeof round !== "number" && typeof round !== "string") return null;
  if (!/^[0-9]+$/.test(String(round))) return null;
  if (!bill || !claim || !convo || !version) return null;
  const amountValue = BigInt(amount);
  const roundValue = BigInt(String(round));
  if (amountValue >= 1n << 128n || roundValue >= 1n << 64n) return null;
  return concat([enc.encode(DOMAIN), str(vaultId), u64(roundValue), str(raidId), str(playerId), bill, u128(amountValue), claim, convo, version]);
}

/**
 * true: the signature is the guard key's. false: it is not. null: this browser cannot check (no Ed25519),
 * or an input is unreadable. A null is never shown as a tick.
 */
export async function verifyVerdict(verdict: Record<string, unknown>, signatureHex: string, guardKeyHex: string): Promise<boolean | null> {
  const message = verdictBytes(verdict);
  const signature = fromHex(signatureHex);
  const key = HEX32.test(guardKeyHex) ? fromHex(guardKeyHex) : null;
  if (!message || !signature || signature.length !== 64 || !key) return null;
  try {
    const imported = await crypto.subtle.importKey("raw", new Uint8Array(key), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, imported, new Uint8Array(signature), new Uint8Array(message));
  } catch {
    return null;
  }
}
