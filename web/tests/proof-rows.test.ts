import assert from "node:assert/strict";
import test from "node:test";
import type { ProofBundle } from "../lib/proof-bundle.ts";
import { proofRows, verifyCommands, type AttestationState, type SeenAttestation } from "../lib/proof-rows.ts";

const WASM = "7260b0cdb4ef453b564024c1c4ac034cf5ed745a5f9d5aab0f1350d67f6adf1f";
const seen: SeenAttestation = {
  call_id: "16df134e-f31e-4f0a-a035-9dc7373c0017", project_id: "p", wasm_hash: WASM, executed_wasm_sha256: WASM,
  input_hash: "aa".repeat(32), output_hash: "0f".repeat(32), worker_measurement: "m", timestamp: 1, quote_bytes: 3, quote_sha256: "bb".repeat(32),
};
const bundle: ProofBundle = {
  verdictCall: { callId: seen.call_id, url: "https://x.test/a", outputSha256: "0f".repeat(32) },
  reply: { model: "m", chatId: "c", requestSha256: "a".repeat(64), responseSha256: "b".repeat(64), signatureText: "m:a:b", signature: "0x", signingAddress: "0x3b753b4406613c5e70ae640508632b600424fa0c", signingAlgo: "ecdsa" },
  preflight: { model: "m", nonce: "c".repeat(64), reportSha256: "d".repeat(64), reportBytes: 1, signingAddress: "0x3B753B4406613C5E70AE640508632B600424FA0C", signingAlgo: "ecdsa", gatewaySigningAddress: "" },
};
const ok = (over: Partial<SeenAttestation> = {}, pinned = WASM): AttestationState => ({ state: "ok", value: { ...seen, ...over }, pinned });
const status = (rows: ReturnType<typeof proofRows>) => Object.fromEntries(rows.map((r) => [r.id, r.status]));

test("everything compared and matching is ticked", () => {
  assert.deepEqual(status(proofRows({ bundle, attestation: ok(), signature: true })), { signature: "ok", enclave: "ok", answer: "ok", model: "ok" });
});

test("a mismatch is bad, never ticked", () => {
  assert.equal(status(proofRows({ bundle, attestation: ok({}, "1".repeat(64)), signature: true })).enclave, "bad");
  assert.equal(status(proofRows({ bundle, attestation: ok({ output_hash: "11".repeat(32) }), signature: true })).answer, "bad");
  assert.equal(status(proofRows({ bundle, attestation: ok({ executed_wasm_sha256: "2".repeat(64) }), signature: true })).enclave, "bad");
  assert.equal(status(proofRows({ bundle, attestation: ok(), signature: false })).signature, "bad");
  const other = { ...bundle, reply: { ...bundle.reply!, signingAddress: "0x" + "9".repeat(40) } };
  assert.equal(status(proofRows({ bundle: other, attestation: ok(), signature: true })).model, "bad");
});

test("what could not be compared is unchecked and says why", () => {
  for (const state of ["pending", "failed", "none"] as const) {
    assert.equal(status(proofRows({ bundle, attestation: { state }, signature: true })).enclave, "unchecked");
  }
  assert.equal(status(proofRows({ bundle: null, attestation: { state: "none" }, signature: null })).signature, "unchecked");
  assert.equal(status(proofRows({ bundle: null, attestation: { state: "none" }, signature: "none" })).model, "unchecked");
  const noPreflight = { ...bundle, preflight: undefined };
  assert.equal(status(proofRows({ bundle: noPreflight, attestation: ok(), signature: true })).model, "unchecked");
  const noCall = { ...bundle, verdictCall: undefined };
  assert.equal(status(proofRows({ bundle: noCall, attestation: ok(), signature: true })).enclave, "unchecked");
});

test("commands are built only from what the raid holds", () => {
  assert.deepEqual(verifyCommands(null), []);
  const commands = verifyCommands(bundle);
  assert.equal(commands[0], `outlayer-verify call ${seen.call_id}`);
  assert.match(commands[1], /nonce=c{64}/);
});
