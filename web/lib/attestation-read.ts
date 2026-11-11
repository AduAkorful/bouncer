import type { SeenAttestation } from "./proof-rows.ts";

const CALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX64 = /^[0-9a-f]{64}$/;

export type AttestationRead = { ok: true; attestation: SeenAttestation } | { ok: false; pending: boolean };

const text = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length < 300 ? v : null);

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** OutLayer's record of one call, kept only when it names that call and carries well-formed hashes and a quote. */
export async function summariseAttestation(raw: unknown, callId: string): Promise<SeenAttestation | null> {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.call_id !== callId) return null;
  const hashes = [r.wasm_hash, r.executed_wasm_sha256, r.input_hash, r.output_hash];
  if (!hashes.every((h) => typeof h === "string" && HEX64.test(h))) return null;
  if (typeof r.tdx_quote !== "string" || r.tdx_quote.length === 0 || typeof r.timestamp !== "number") return null;
  const projectId = text(r.project_id);
  const measurement = text(r.worker_measurement);
  if (!projectId || !measurement) return null;
  return {
    call_id: callId,
    project_id: projectId,
    wasm_hash: r.wasm_hash as string,
    executed_wasm_sha256: r.executed_wasm_sha256 as string,
    input_hash: r.input_hash as string,
    output_hash: r.output_hash as string,
    worker_measurement: measurement,
    timestamp: r.timestamp,
    quote_bytes: r.tdx_quote.length / 2,
    quote_sha256: await sha256Hex(r.tdx_quote),
  };
}

export function attestationUrl(base: string, callId: string): string | null {
  if (!CALL_ID.test(callId)) return null;
  return `${base.replace(/\/+$/, "")}/attestations/by-call/${callId}`;
}

/**
 * Reads the attestation straight from OutLayer in this browser, so no Bouncer server sits between OutLayer's
 * record and the comparison. A 404 means OutLayer has not published it yet.
 */
export async function readAttestation(base: string, callId: string, fetchImpl: typeof fetch = fetch, timeoutMs = 12_000): Promise<AttestationRead> {
  const url = attestationUrl(base, callId);
  if (!url) return { ok: false, pending: false };
  try {
    const response = await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (response.status === 404) return { ok: false, pending: true };
    if (!response.ok) return { ok: false, pending: false };
    const summary = await summariseAttestation(await response.json(), callId);
    return summary ? { ok: true, attestation: summary } : { ok: false, pending: false };
  } catch {
    return { ok: false, pending: false };
  }
}
