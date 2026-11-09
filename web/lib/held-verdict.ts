import type { ApiResult } from "./api.ts";

/** A signed verdict this device holds until the vault has recorded it. */
export type HeldVerdict = { verdict: Record<string, unknown>; signature: string };

export type SubmitOutcome =
  | { ok: true; transactionHash: string | null }
  | { ok: false; message: string; retry: boolean };

type Post = (path: string, body: unknown) => Promise<ApiResult>;

/** Only a verdict with its signature, and no recorded transaction, is still held. */
export function heldVerdict(raid: { verdict?: unknown; signature?: unknown; transactionHash?: unknown; recorded?: unknown } | null): HeldVerdict | null {
  if (!raid || raid.recorded === true) return null;
  if (typeof raid.transactionHash === "string" && raid.transactionHash.length > 0) return null;
  if (!raid.verdict || typeof raid.verdict !== "object" || Array.isArray(raid.verdict)) return null;
  if (typeof raid.signature !== "string" || !hexBytes(raid.signature)) return null;
  return { verdict: raid.verdict as Record<string, unknown>, signature: raid.signature };
}

/**
 * Sends the verdict through the relay. A refusal is checked against the vault's crack record, because
 * an earlier send may have landed while its reply was lost, and a second send of the same verdict is refused.
 */
export async function submitHeld(held: HeldVerdict, raidId: string, vaultId: string, post: Post): Promise<SubmitOutcome> {
  const verdict = verdictWire(held.verdict);
  const signature = hexBytes(held.signature);
  if (!verdict || !signature) return { ok: false, message: "This verdict cannot be read on this device.", retry: false };
  const sent = await post("/verdict", { verdict, signature });
  const body = sent.ok ? (sent.body as { ok?: boolean; error?: string; transactionHash?: string } | null) : null;
  if (body?.ok === true) return { ok: true, transactionHash: typeof body.transactionHash === "string" ? body.transactionHash : null };
  if (await crackRecorded(raidId, vaultId, post)) return { ok: true, transactionHash: null };
  return refused(sent.ok ? sent.status : 0, body?.error);
}

async function crackRecorded(raidId: string, vaultId: string, post: Post): Promise<boolean> {
  const sent = await post("/crack", { raid_id: raidId, vault_id: vaultId });
  if (!sent.ok) return false;
  const body = sent.body as { ok?: boolean; crack?: unknown } | null;
  return body?.ok === true && Boolean(body.crack) && typeof body.crack === "object";
}

function refused(status: number, error: string | undefined): { ok: false; message: string; retry: boolean } {
  if (error === "vault") return { ok: false, message: "This round has closed. The verdict can no longer be recorded.", retry: false };
  if (error === "ticketed") return { ok: false, message: "A ticketed door is submitted by the signed-in account.", retry: false };
  if (error === "relay is owner") return { ok: false, message: "This door cannot take a verdict from the relay.", retry: false };
  if (status === 429) return { ok: false, message: "The vault is busy. Try again in a minute.", retry: true };
  return { ok: false, message: "The vault did not record the verdict.", retry: true };
}

export function hexBytes(hex: string): number[] | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) out.push(Number.parseInt(hex.slice(i, i + 2), 16));
  return out;
}

export function verdictWire(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const hash = (key: string) => {
    const hex = row[key];
    return typeof hex === "string" ? hexBytes(hex) : null;
  };
  const billHash = hash("bill_hash");
  const claimPk = hash("claim_pk");
  const conversationHash = hash("conversation_hash");
  const guardVersion = hash("guard_version");
  if (!billHash || !claimPk || !conversationHash || !guardVersion) return null;
  return { ...row, bill_hash: billHash, claim_pk: claimPk, conversation_hash: conversationHash, guard_version: guardVersion };
}

export function verdictAmount(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const amount = (value as { amount?: unknown }).amount;
  return typeof amount === "string" && /^[0-9]+$/.test(amount) ? amount : null;
}
