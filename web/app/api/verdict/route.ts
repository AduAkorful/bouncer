import { readRelayEnv } from "@/lib/config";
import { httpRpc, readDoor } from "@/lib/chain";
import { parseVerdictSubmission, submissionAllowed } from "@/lib/verdict-turn";
import { submitVerdict } from "@/lib/submit-verdict";

export async function POST(request: Request) {
  const env = readRelayEnv(process.env);
  if (!env.ok) return Response.json({ ok: false, error: "missing env", missing: env.missing }, { status: 400 });
  let clientBody: unknown;
  try {
    clientBody = await request.json();
  } catch {
    return Response.json({ ok: false, error: "verdict" }, { status: 400 });
  }
  const parsed = parseVerdictSubmission(clientBody);
  if (!parsed.ok) return Response.json(parsed, { status: 400 });
  const door = await readDoor(httpRpc(env.env.rpcUrl), env.env.contractId, env.env.vaultId);
  if (!door.ok) return Response.json(door, { status: 502 });
  const allowed = submissionAllowed(door.vault, door.owner, env.env.accountId, parsed.verdict, env.env.vaultId);
  if (!allowed.ok) return Response.json(allowed, { status: 409 });
  const sent = await submitVerdict(env.env, parsed.verdict, parsed.signature);
  if (!sent.ok) return Response.json(sent, { status: 502 });
  return Response.json({ ok: true, transactionHash: sent.transactionHash });
}
