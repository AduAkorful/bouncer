import type { ProofBundle } from "./proof-bundle";

/** What this browser read from OutLayer for one guard call. */
export type SeenAttestation = {
  call_id: string;
  project_id: string;
  wasm_hash: string;
  executed_wasm_sha256: string;
  input_hash: string;
  output_hash: string;
  worker_measurement: string;
  timestamp: number;
  quote_bytes: number;
  quote_sha256: string;
};

export type AttestationState =
  | { state: "none" }
  | { state: "pending" }
  | { state: "failed" }
  | { state: "unpinned" }
  | { state: "ok"; value: SeenAttestation; pinned: string };

export type Row = { id: string; label: string; status: "ok" | "bad" | "unchecked"; detail: string };

export const short = (hash: string, n = 10) => (hash.length > n * 2 + 1 ? `${hash.slice(0, n)}…${hash.slice(-4)}` : hash);

/**
 * The rows of the Verified panel. A row is `ok` only when this page compared the two things itself. Anything it
 * could not compare is `unchecked` and says so, and a comparison that failed is `bad`. Nothing is ticked by default.
 */
export function proofRows(input: {
  bundle: ProofBundle | null;
  attestation: AttestationState;
  /** The verdict signature against the guard key on the vault: true, false, or null when it could not be checked. */
  signature: boolean | null | "none";
}): Row[] {
  const { bundle, attestation, signature } = input;
  const rows: Row[] = [];

  if (signature === "none") {
    rows.push({ id: "signature", label: "Signed by the vault's guard key", status: "unchecked", detail: "No signed verdict is stored on this device." });
  } else if (signature === true) {
    rows.push({ id: "signature", label: "Signed by the vault's guard key", status: "ok", detail: "This browser checked the verdict's signature against the guard key stored on the vault." });
  } else if (signature === false) {
    rows.push({ id: "signature", label: "Signed by the vault's guard key", status: "bad", detail: "The signature does not match the guard key stored on the vault." });
  } else {
    rows.push({ id: "signature", label: "Signed by the vault's guard key", status: "unchecked", detail: "This browser could not check the signature." });
  }

  const call = bundle?.verdictCall;
  if (!call) {
    rows.push({ id: "enclave", label: "Made by the published guard code", status: "unchecked", detail: "This verdict has no attestation link. It was signed before attestations were kept." });
  } else if (attestation.state === "pending" || attestation.state === "none") {
    rows.push({ id: "enclave", label: "Made by the published guard code", status: "unchecked", detail: "OutLayer has not published this call's attestation yet. It usually takes a few seconds." });
  } else if (attestation.state === "unpinned") {
    rows.push({ id: "enclave", label: "Made by the published guard code", status: "unchecked", detail: "This site was built without a pinned guard version, so there is nothing to compare the attestation with." });
  } else if (attestation.state === "failed") {
    rows.push({ id: "enclave", label: "Made by the published guard code", status: "unchecked", detail: "The attestation could not be read just now." });
  } else {
    const a = attestation.value;
    const sameWasm = a.wasm_hash === a.executed_wasm_sha256 && a.wasm_hash === attestation.pinned;
    rows.push(
      sameWasm
        ? { id: "enclave", label: "Made by the published guard code", status: "ok", detail: `OutLayer's Intel TDX attestation, read by this browser from OutLayer, names guard ${short(a.wasm_hash)}: the version built into this site. The quote itself is checked with the command below, not in the browser.` }
        : { id: "enclave", label: "Made by the published guard code", status: "bad", detail: `The attested code ${short(a.wasm_hash)} is not the version built into this site (${short(attestation.pinned)}).` },
    );
    rows.push(
      a.output_hash === call.outputSha256
        ? { id: "answer", label: "This answer is the one attested", status: "ok", detail: `The answer this site received hashes to ${short(a.output_hash)}, the output hash in OutLayer's attestation.` }
        : { id: "answer", label: "This answer is the one attested", status: "bad", detail: "The attested output hash is not the hash of the answer this site received." },
    );
  }

  const reply = bundle?.reply;
  const preflight = bundle?.preflight;
  if (!reply) {
    rows.push({ id: "model", label: "Reply written by an attested model", status: "unchecked", detail: "No model evidence came with this reply." });
  } else if (!preflight) {
    rows.push({ id: "model", label: "Reply written by an attested model", status: "unchecked", detail: `The model signed this reply (${short(reply.signingAddress, 8)}), but no attestation report was taken for this raid.` });
  } else if (preflight.signingAddress.toLowerCase() === reply.signingAddress.toLowerCase()) {
    rows.push({ id: "model", label: "Reply written by an attested model", status: "ok", detail: `The model's signature on the reply and the attestation report taken for this raid name the same signer, ${short(reply.signingAddress, 8)}.` });
  } else {
    rows.push({ id: "model", label: "Reply written by an attested model", status: "bad", detail: "The reply was signed by a different signer than the one in the attestation report." });
  }
  return rows;
}

/** Commands a judge can run, built only from what the raid holds. */
export function verifyCommands(bundle: ProofBundle | null): string[] {
  const out: string[] = [];
  if (bundle?.verdictCall) out.push(`outlayer-verify call ${bundle.verdictCall.callId}`);
  if (bundle?.preflight) {
    const { nonce, model } = bundle.preflight;
    out.push(`curl -s -H 'x-no-aliasing: true' 'https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce=${nonce}&model=${model}&provider=near'`);
  }
  return out;
}
