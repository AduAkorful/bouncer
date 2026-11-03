import { guestCanSubmit, type VaultView } from "./vault.ts";

export type VerdictBody = {
  vault_id: string;
  round: string;
  raid_id: string;
  player_id: string;
  bill_hash: number[];
  amount: string;
  claim_pk: number[];
  conversation_hash: number[];
  guard_version: number[];
};

export function parseVerdictSubmission(value: unknown): { ok: true; verdict: VerdictBody; signature: number[] } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "verdict" };
  const row = value as Record<string, unknown>;
  const verdict = row.verdict;
  if (!verdict || typeof verdict !== "object") return { ok: false, error: "verdict" };
  const body = verdict as Record<string, unknown>;
  const vaultId = text(body.vault_id);
  const round = digits(body.round) ?? (typeof body.round === "number" && Number.isSafeInteger(body.round) ? String(body.round) : null);
  const raidId = text(body.raid_id);
  const playerId = text(body.player_id);
  const amount = digits(body.amount);
  const billHash = bytes(body.bill_hash, 32);
  const claimPk = bytes(body.claim_pk, 32);
  const conversationHash = bytes(body.conversation_hash, 32);
  const guardVersion = bytes(body.guard_version, 32);
  const signature = bytes(row.signature, 64);
  if (!vaultId || !round || !raidId || !playerId || !amount || !billHash || !claimPk || !conversationHash || !guardVersion || !signature) {
    return { ok: false, error: "verdict" };
  }
  return {
    ok: true,
    verdict: {
      vault_id: vaultId,
      round,
      raid_id: raidId,
      player_id: playerId,
      bill_hash: billHash,
      amount,
      claim_pk: claimPk,
      conversation_hash: conversationHash,
      guard_version: guardVersion,
    },
    signature,
  };
}

export function submissionAllowed(
  vault: VaultView,
  owner: string,
  relayAccount: string,
  verdict: VerdictBody,
  vaultId: string,
): { ok: true } | { ok: false; error: string } {
  const guest = guestCanSubmit(vault, owner, relayAccount);
  if (!guest.ok) return guest;
  if (verdict.vault_id !== vaultId || verdict.round !== vault.round) return { ok: false, error: "vault" };
  return { ok: true };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function digits(value: unknown): string | null {
  return typeof value === "string" && /^[0-9]+$/.test(value) ? value : null;
}

function bytes(value: unknown, size: number): number[] | null {
  if (!Array.isArray(value) || value.length !== size) return null;
  if (value.some((byte) => typeof byte !== "number" || !Number.isInteger(byte) || byte < 0 || byte > 255)) return null;
  return value;
}
