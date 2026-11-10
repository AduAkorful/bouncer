import { createHash } from "node:crypto";

/** One guard call, as OutLayer attests it. A plain summary: the quote itself is hashed, not carried. */
export type AttestationSummary = {
  call_id: string;
  project_id: string;
  wasm_hash: string;
  executed_wasm_sha256: string;
  input_hash: string;
  output_hash: string;
  worker_measurement: string;
  build_target: string;
  caller_account_id: string;
  payment_key_owner: string;
  timestamp: number;
  quote_bytes: number;
  quote_sha256: string;
};

export type AttestationAnswer = { ok: true; attestation: AttestationSummary } | { ok: false; pending: boolean };

export const CALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const FRESH_MS = 10 * 60_000;
const MAX_KEPT = 500;

export function sha256Hex(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}

/** What OutLayer hashed as the call's output: the guard's own text when it is text, else its compact JSON. */
export function outputText(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") return JSON.stringify(output);
  return null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length < 300 ? v : null);

/** Only a record that names this call, and carries well-formed hashes, is a summary. Anything else is nothing. */
export function summarise(raw: unknown, callId: string): AttestationSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.call_id !== callId) return null;
  const hashes = [r.wasm_hash, r.executed_wasm_sha256, r.input_hash, r.output_hash];
  if (!hashes.every((h) => typeof h === "string" && HEX64.test(h))) return null;
  if (typeof r.tdx_quote !== "string" || r.tdx_quote.length === 0) return null;
  const projectId = str(r.project_id);
  const measurement = str(r.worker_measurement);
  const target = str(r.build_target);
  const caller = str(r.caller_account_id);
  const owner = str(r.payment_key_owner);
  if (!projectId || !measurement || !target || !caller || !owner || typeof r.timestamp !== "number") return null;
  return {
    call_id: callId,
    project_id: projectId,
    wasm_hash: r.wasm_hash as string,
    executed_wasm_sha256: r.executed_wasm_sha256 as string,
    input_hash: r.input_hash as string,
    output_hash: r.output_hash as string,
    worker_measurement: measurement,
    build_target: target,
    caller_account_id: caller,
    payment_key_owner: owner,
    timestamp: r.timestamp,
    quote_bytes: r.tdx_quote.length / 2,
    quote_sha256: sha256Hex(r.tdx_quote),
  };
}

/**
 * Looks an attestation up at OutLayer, which publishes it a few seconds after the call. A 404 is "not yet",
 * not a failure. A good answer is kept for ten minutes.
 */
export function createAttestationLookup(baseUrl: string, now: () => number, fetchImpl: typeof fetch = fetch) {
  const kept = new Map<string, { at: number; attestation: AttestationSummary }>();
  return async (callId: string): Promise<AttestationAnswer> => {
    if (!CALL_ID.test(callId)) return { ok: false, pending: false };
    const hit = kept.get(callId);
    if (hit && now() - hit.at < FRESH_MS) return { ok: true, attestation: hit.attestation };
    let response: Response;
    try {
      response = await fetchImpl(new URL(`/attestations/by-call/${callId}`, baseUrl), { signal: AbortSignal.timeout(8000) });
    } catch {
      return { ok: false, pending: false };
    }
    if (response.status === 404) return { ok: false, pending: true };
    if (!response.ok) return { ok: false, pending: false };
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return { ok: false, pending: false };
    }
    const attestation = summarise(raw, callId);
    if (!attestation) return { ok: false, pending: false };
    if (kept.size >= MAX_KEPT) kept.delete(kept.keys().next().value as string);
    kept.set(callId, { at: now(), attestation });
    return { ok: true, attestation };
  };
}
