/** Room for the map entry and key overhead the contract's own measure includes. */
const OVERHEAD_BYTES = 400n;
const MARGIN_NUMERATOR = 5n;
const MARGIN_DENOMINATOR = 4n;

export function depositFor(writtenBytes: number, yoctoPerByte: bigint): bigint {
  if (!Number.isSafeInteger(writtenBytes) || writtenBytes < 0 || yoctoPerByte <= 0n) throw new Error("deposit");
  return ((BigInt(writtenBytes) + OVERHEAD_BYTES) * yoctoPerByte * MARGIN_NUMERATOR) / MARGIN_DENOMINATOR;
}

/** An upper estimate of the bytes a new vault record adds: the id, the record, and the id list entry. */
export function createBytes(vaultId: string): number {
  return new TextEncoder().encode(vaultId).length * 2 + 400;
}

export function specBytes(ctBytes: number, card: string, vaultId: string): number {
  return ctBytes + new TextEncoder().encode(card).length + new TextEncoder().encode(vaultId).length * 2 + 64;
}
