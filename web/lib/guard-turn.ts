import { admitTurn, commitTurn, markKey, type Mark } from "./marks.ts";
import { buildOutlayerRequest, type OutlayerCall } from "./relay.ts";
import type { GuardEnv } from "./config.ts";

export type TurnResult = { status: number; body: unknown; called: boolean };

export async function runGuardTurn(
  env: GuardEnv | null | undefined,
  marks: Map<string, Mark>,
  clientBody: unknown,
  post: (call: OutlayerCall) => Promise<{ ok: true; body: unknown } | { ok: false; error: string }>,
): Promise<TurnResult> {
  const built = buildOutlayerRequest(env, clientBody);
  if (!built.ok) return { status: 400, body: { ok: false, error: built.error }, called: false };
  const input = built.call.body.input;
  const op = String(input.op);
  const vaultId = typeof input.vault_id === "string" ? input.vault_id : "";
  const playerId = typeof input.player_id === "string" ? input.player_id : "";
  const round = input.round;
  const roundId = typeof round === "string" || typeof round === "number" ? String(round) : "";
  if (!vaultId || !playerId || !/^[0-9]+$/.test(roundId)) {
    return { status: 400, body: { ok: false, error: "bad id" }, called: false };
  }
  const key = markKey(vaultId, roundId, playerId);
  const admitted = admitTurn(marks, op, key, input.blob);
  if (!admitted.ok) return { status: 409, body: { ok: false, error: admitted.error }, called: false };
  const posted = await post(built.call);
  if (!posted.ok) return { status: 502, body: { ok: false, error: posted.error }, called: true };
  if (posted.body && typeof posted.body === "object" && (posted.body as { ok?: unknown }).ok === true) {
    commitTurn(marks, op, key, (posted.body as { blob?: unknown }).blob);
  }
  return { status: 200, body: posted.body, called: true };
}
