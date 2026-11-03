import { revealBytes, hexToBytes } from "./bytes";

export async function revealChecksOut(input: {
  vaultId: string;
  round: bigint;
  playerId: string;
  ledgerHashHex: string;
  commitmentHex: string;
  signatureHex: string;
  guardPkHex: string | null;
  storedCommitmentHex: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.guardPkHex || !input.storedCommitmentHex) return { ok: false, error: "vault" };
  if (input.commitmentHex !== input.storedCommitmentHex) return { ok: false, error: "commitment" };
  const ledgerHash = hexToBytes(input.ledgerHashHex);
  const commitment = hexToBytes(input.commitmentHex);
  const signature = hexToBytes(input.signatureHex);
  const guardPk = hexToBytes(input.guardPkHex);
  if (!ledgerHash || !commitment || !signature || !guardPk || signature.length !== 64) return { ok: false, error: "signature" };
  const key = await crypto.subtle.importKey("raw", new Uint8Array(guardPk), { name: "Ed25519" }, false, ["verify"]);
  const message = revealBytes(input.vaultId, input.round, input.playerId, ledgerHash, commitment);
  const valid = await crypto.subtle.verify({ name: "Ed25519" }, key, new Uint8Array(signature), new Uint8Array(message));
  return valid ? { ok: true } : { ok: false, error: "signature" };
}
