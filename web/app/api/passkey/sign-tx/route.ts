import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { signPasskeyTransaction } from "@/lib/passkey-sponsor";

export async function POST(request: Request) {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) return Response.json({ ok: false, error: "sign" }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "sign" }, { status: 400 });
  }
  const signed = await signPasskeyTransaction(relay.env, labels.env.authContractId, body);
  if (!signed.ok) return Response.json(signed, { status: 502 });
  return Response.json({ hash: signed.hash, result: signed.result });
}
