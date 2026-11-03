import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { createPasskeyAccount } from "@/lib/passkey-sponsor";

export async function POST(request: Request) {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) return Response.json({ ok: false, error: "account" }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "account" }, { status: 400 });
  }
  const publicKey = body && typeof body === "object" ? (body as { publicKey?: unknown }).publicKey : null;
  if (typeof publicKey !== "string") return Response.json({ ok: false, error: "account" }, { status: 400 });
  const created = await createPasskeyAccount(relay.env, labels.env.authContractId, publicKey);
  return Response.json(created, { status: created.ok ? 200 : 502 });
}
