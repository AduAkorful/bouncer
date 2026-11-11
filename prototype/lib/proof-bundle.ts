/**
 * What the guard hands back as evidence, kept with the raid. Evidence only: a missing or malformed piece is
 * simply absent, and nothing here ever decides a verdict.
 */

export type Attestation = { callId: string; url: string; outputSha256: string };

export type ReplyEvidence = {
  model: string;
  chatId: string;
  requestSha256: string;
  responseSha256: string;
  signatureText: string;
  signature: string;
  signingAddress: string;
  signingAlgo: string;
};

export type ModelPreflight = {
  model: string;
  nonce: string;
  reportSha256: string;
  reportBytes: number;
  signingAddress: string;
  signingAlgo: string;
  gatewaySigningAddress: string;
};

export type ProofBundle = {
  /** The guard call that signed the verdict. */
  verdictCall?: Attestation;
  /** The model's signature on the reply that came with the verdict. */
  reply?: ReplyEvidence;
  /** The model's attestation, fetched with a fresh nonce when the raid opened. */
  preflight?: ModelPreflight;
};

const HEX64 = /^[0-9a-f]{64}$/;
const CALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const text = (v: unknown, max = 400): string | null => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

export function readAttestation(value: unknown): Attestation | undefined {
  const r = rec(value);
  if (!r) return undefined;
  const callId = text(r.call_id);
  const url = text(r.url, 500);
  const out = text(r.output_sha256);
  if (!callId || !CALL_ID.test(callId) || !url || !out || !HEX64.test(out)) return undefined;
  try {
    if (new URL(url).protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }
  return { callId, url, outputSha256: out };
}

export function readReply(value: unknown): ReplyEvidence | undefined {
  const r = rec(value);
  if (!r) return undefined;
  const model = text(r.model);
  const chatId = text(r.chat_id);
  const req = text(r.request_sha256);
  const res = text(r.response_sha256);
  const signatureText = text(r.signature_text, 600);
  const signature = text(r.signature, 400);
  const address = text(r.signing_address);
  const algo = text(r.signing_algo, 20);
  if (!model || !chatId || !req || !res || !signatureText || !signature || !address || !algo) return undefined;
  if (!HEX64.test(req) || !HEX64.test(res) || !ADDRESS.test(address)) return undefined;
  // The text the model signed is built from the two hashes. A record that disagrees with itself is nothing.
  if (signatureText !== `${model}:${req}:${res}`) return undefined;
  return { model, chatId, requestSha256: req, responseSha256: res, signatureText, signature, signingAddress: address, signingAlgo: algo };
}

export function readPreflight(value: unknown): ModelPreflight | undefined {
  const r = rec(value);
  if (!r) return undefined;
  const model = text(r.model);
  const nonce = text(r.nonce);
  const report = text(r.report_sha256);
  const address = text(r.signing_address);
  const algo = text(r.signing_algo, 20);
  if (!model || !nonce || !HEX64.test(nonce) || !report || !HEX64.test(report) || !address || !ADDRESS.test(address) || !algo) return undefined;
  if (typeof r.report_bytes !== "number" || !Number.isSafeInteger(r.report_bytes) || r.report_bytes <= 0) return undefined;
  const gateway = typeof r.gateway_signing_address === "string" && ADDRESS.test(r.gateway_signing_address) ? r.gateway_signing_address : "";
  return { model, nonce, reportSha256: report, reportBytes: r.report_bytes, signingAddress: address, signingAlgo: algo, gatewaySigningAddress: gateway };
}

/**
 * Folds one guard answer into the raid's bundle. The model's preflight comes with the raid opening. The
 * verdict's call and its reply evidence come with the answer that signed the verdict, and replace any earlier ones.
 */
export function mergeProof(previous: ProofBundle | null | undefined, payload: Record<string, unknown>): ProofBundle {
  const next: ProofBundle = { ...(previous ?? {}) };
  const preflight = readPreflight(payload.model_proof);
  if (preflight) next.preflight = preflight;
  if (payload.ok === true && typeof payload.signature === "string" && payload.verdict) {
    const call = readAttestation(payload.attestation);
    if (call) next.verdictCall = call;
    else delete next.verdictCall;
    const reply = readReply(payload.proof);
    if (reply) next.reply = reply;
    else delete next.reply;
  }
  return next;
}
