import type { GuardEnv } from "../../web/lib/config.ts";
import type { Rpc } from "../../web/lib/chain.ts";
import { readDoor } from "../../web/lib/chain.ts";
import { parseSpecCt } from "../../web/lib/sponsor-views.ts";
import { viewRequest } from "../../web/lib/vault.ts";
import { sponsorCall, type Post } from "./guard-client.ts";

export type Commit = { commitment: string; guardVersion: string; signature: string; round: number };

/**
 * The guard's signed commitment for the round a vault would open next. The vault, its round, and its
 * sealed spec are read from chain here, so a caller picks only the vault and cannot ask for another round.
 */
export async function requestCommit(input: {
  rpc: Rpc;
  post: Post;
  guard: GuardEnv;
  contractId: string;
  vaultId: string;
  /** Asked right before the guard is called, so a refused vault spends nothing. */
  admit?: () => boolean;
}): Promise<{ ok: true; commit: Commit } | { ok: false; status: number; error: string }> {
  const door = await readDoor(input.rpc, input.contractId, input.vaultId);
  if (!door.ok) return { ok: false, status: 502, error: "vault" };
  const { vault } = door;
  if (vault.open) return { ok: false, status: 409, error: "The door is already open." };
  if (vault.suspended) return { ok: false, status: 409, error: "This vault is suspended." };
  const round = Number(BigInt(vault.round) + (vault.closedPendingBump ? 1n : 0n));
  const call: Record<string, unknown> = { vault_id: input.vaultId, round };
  if (vault.specHash) {
    const spec = await input.rpc(viewRequest(input.contractId, "get_spec", { vault_id: input.vaultId }));
    const ct = spec.ok ? parseSpecCt(spec.value) : null;
    if (!ct || !ct.ok || ct.value === null) return { ok: false, status: 502, error: "spec" };
    call.spec_ct = ct.value;
  }
  if (input.admit && !input.admit()) return { ok: false, status: 429, error: "busy" };
  const posted = await input.post(sponsorCall(input.guard, "commit", call));
  if (!posted.ok) return { ok: false, status: 502, error: "guard" };
  const out = posted.body as Record<string, unknown> | null;
  if (!out || out.ok !== true || typeof out.commitment !== "string" || typeof out.guard_version !== "string" || typeof out.signature !== "string") {
    return { ok: false, status: 422, error: typeof out?.error === "string" ? out.error : "guard" };
  }
  return { ok: true, commit: { commitment: out.commitment, guardVersion: out.guard_version, signature: out.signature, round } };
}
