import { readGuardEnv } from "@/lib/config";
import { readGuardOutput } from "@/lib/relay";
import { runGuardTurn } from "@/lib/guard-turn";
import type { Mark } from "@/lib/marks";
import type { OutlayerCall } from "@/lib/relay";

const marks = new Map<string, Mark>();

export async function POST(request: Request) {
  const env = readGuardEnv(process.env);
  let clientBody: unknown;
  try {
    clientBody = await request.json();
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const result = await runGuardTurn(env.ok ? env.env : null, marks, clientBody, postOutlayer);
  return Response.json(result.body, { status: result.status });
}

async function postOutlayer(call: OutlayerCall): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const response = await fetch(call.url, {
    method: "POST",
    headers: call.headers,
    body: JSON.stringify(call.body),
  });
  if (!response.ok) return { ok: false, error: "guard" };
  try {
    return readGuardOutput(await response.json());
  } catch {
    return { ok: false, error: "guard" };
  }
}
