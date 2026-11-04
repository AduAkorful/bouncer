import type { GuardEnv } from "../../web/lib/config.ts";
import { readGuardOutput, type OutlayerCall } from "../../web/lib/relay.ts";

export type Post = (call: OutlayerCall) => Promise<{ ok: true; body: unknown } | { ok: false; error: string }>;

/**
 * One call to OutLayer. A network error or a 5xx is tried once more with the same body. The guard
 * answers a repeat of a call it already ran from its stored reply (plan 12 §3a). A 4xx is never retried.
 */
export function createGuardPost(fetchImpl: typeof fetch = fetch): Post {
  const attempt = async (call: OutlayerCall): Promise<{ ok: true; body: unknown } | { ok: false; error: string; retry: boolean }> => {
    let response: Response;
    try {
      response = await fetchImpl(call.url, { method: "POST", headers: call.headers, body: JSON.stringify(call.body) });
    } catch {
      return { ok: false, error: "guard", retry: true };
    }
    if (!response.ok) return { ok: false, error: "guard", retry: response.status >= 500 };
    try {
      const out = readGuardOutput(await response.json());
      return out.ok ? out : { ok: false, error: out.error, retry: true };
    } catch {
      return { ok: false, error: "guard", retry: true };
    }
  };
  return async (call) => {
    const first = await attempt(call);
    if (first.ok || !first.retry) return first.ok ? first : { ok: false, error: first.error };
    const second = await attempt(call);
    return second.ok ? second : { ok: false, error: second.error };
  };
}

export const SPONSOR_OPS = ["draft_spec", "check_spec", "seal_spec", "commit"] as const;
export type SponsorOp = (typeof SPONSOR_OPS)[number];

/** A call for one of the sponsor ops. Players cannot reach these through `/guard`. */
export function sponsorCall(env: GuardEnv, op: SponsorOp, input: Record<string, unknown>): OutlayerCall {
  return {
    url: env.callUrl,
    headers: { "content-type": "application/json", "x-payment-key": env.paymentKey },
    body: {
      input: { ...input, op },
      version_key: env.versionKey,
      max_execution_seconds: env.maxExecutionSeconds,
      max_memory_mb: env.maxMemoryMb,
    },
  };
}
