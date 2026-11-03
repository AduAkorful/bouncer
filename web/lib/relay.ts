import type { GuardEnv } from "./config";

const GUARD_OPS = new Set(["open", "say", "bill", "reveal"]);
const DROPPED = new Set(["version_key", "secrets_ref", "authorization", "x-payment-key"]);

export type OutlayerCall = {
  url: string;
  headers: { "content-type": string; "x-payment-key": string };
  body: {
    input: Record<string, unknown>;
    version_key: string;
    max_execution_seconds: number;
    max_memory_mb: number;
  };
};

/** The HTTPS API wraps the guard's JSON in `output`. The raid reads the guard's object. */
export function readGuardOutput(body: unknown): { ok: true; body: unknown } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "guard" };
  const record = body as Record<string, unknown>;
  if (typeof record.status === "string" && record.status !== "completed") return { ok: false, error: "guard" };
  const output = "output" in record ? record.output : record;
  if (typeof output === "string") {
    try {
      return { ok: true, body: JSON.parse(output) };
    } catch {
      return { ok: false, error: "guard" };
    }
  }
  if (output && typeof output === "object") return { ok: true, body: output };
  return { ok: false, error: "guard" };
}

export function buildOutlayerRequest(
  env: GuardEnv | null | undefined,
  clientBody: unknown,
): { ok: true; call: OutlayerCall } | { ok: false; error: string } {
  if (!env?.callUrl || !env.paymentKey || !env.versionKey) return { ok: false, error: "missing env" };
  if (!Number.isSafeInteger(env.maxExecutionSeconds) || !Number.isSafeInteger(env.maxMemoryMb)) {
    return { ok: false, error: "missing env" };
  }
  if (!clientBody || typeof clientBody !== "object" || Array.isArray(clientBody)) return { ok: false, error: "bad request" };
  const source = clientBody as Record<string, unknown>;
  const op = source.op;
  if (typeof op !== "string" || !GUARD_OPS.has(op)) return { ok: false, error: "unknown" };
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (DROPPED.has(key.toLowerCase())) continue;
    input[key] = value;
  }
  return {
    ok: true,
    call: {
      url: env.callUrl,
      headers: {
        "content-type": "application/json",
        "x-payment-key": env.paymentKey,
      },
      body: {
        input,
        version_key: env.versionKey,
        max_execution_seconds: env.maxExecutionSeconds,
        max_memory_mb: env.maxMemoryMb,
      },
    },
  };
}
