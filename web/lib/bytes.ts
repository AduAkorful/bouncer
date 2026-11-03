/** Borsh for the vault's claim and reveal messages. Domain bytes are not length-prefixed. */

const text = new TextEncoder();

export function claimBytes(vaultId: string, round: bigint, raidId: string, payout: string): Uint8Array {
  return domainBytes("bouncer.claim.v1", borshClaim(vaultId, round, raidId, payout));
}

export function revealBytes(
  vaultId: string,
  round: bigint,
  playerId: string,
  ledgerHash: Uint8Array,
  commitment: Uint8Array,
): Uint8Array {
  return domainBytes("bouncer.reveal.v1", borshReveal(vaultId, round, playerId, ledgerHash, commitment));
}

export function domainBytes(domain: string, body: Uint8Array): Uint8Array {
  const prefix = text.encode(domain);
  const out = new Uint8Array(prefix.length + body.length);
  out.set(prefix, 0);
  out.set(body, prefix.length);
  return out;
}

function borshClaim(vaultId: string, round: bigint, raidId: string, payout: string): Uint8Array {
  return concat([borshString(vaultId), borshU64(round), borshString(raidId), borshString(payout)]);
}

function borshReveal(
  vaultId: string,
  round: bigint,
  playerId: string,
  ledgerHash: Uint8Array,
  commitment: Uint8Array,
): Uint8Array {
  return concat([
    borshString(vaultId),
    borshU64(round),
    borshString(playerId),
    fixed(ledgerHash, 32),
    fixed(commitment, 32),
  ]);
}

export function borshString(value: string): Uint8Array {
  const bytes = text.encode(value);
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length, true);
  out.set(bytes, 4);
  return out;
}

export function borshU64(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) throw new Error("u64");
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return out;
}

function fixed(bytes: Uint8Array, size: number): Uint8Array {
  if (bytes.length !== size) throw new Error("bytes");
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
