import assert from "node:assert/strict";
import test from "node:test";
import { mergeProof, readAttestation, readPreflight, readReply } from "../lib/proof-bundle.ts";

const call = "16df134e-f31e-4f0a-a035-9dc7373c0017";
const attestation = { call_id: call, url: `https://testnet-api.outlayer.ai/attestations/by-call/${call}`, output_sha256: "0f".repeat(32) };
const req = "d778dcc985af4d81768f394eb40a872e1b6825de7fce378a860531b6af867d2d";
const res = "9b0e1edd6545272b13daedab454eddc9603c91e4115b0c9f39db404424584025";
const reply = {
  model: "z-ai/glm-5.3-flash", chat_id: "c1", request_sha256: req, response_sha256: res,
  signature_text: `z-ai/glm-5.3-flash:${req}:${res}`, signature: "0xabc", signing_address: "0x3b753b4406613c5e70ae640508632b600424fa0c", signing_algo: "ecdsa",
};
const preflight = {
  model: "z-ai/glm-5.3-flash", nonce: "a4".repeat(32), report_sha256: "bb".repeat(32), report_bytes: 287057,
  signing_address: "0x3b753b4406613c5e70ae640508632b600424fa0c", signing_algo: "ecdsa", gateway_signing_address: "0xb98a789cdc4817275f5155593ba73ef2a957e779",
};

test("well-formed pieces are read, and malformed ones are nothing", () => {
  assert.equal(readAttestation(attestation)?.callId, call);
  assert.equal(readAttestation({ ...attestation, url: "http://x.test/a" }), undefined);
  assert.equal(readAttestation({ ...attestation, call_id: "nope" }), undefined);
  assert.equal(readAttestation({ ...attestation, output_sha256: "abc" }), undefined);
  assert.equal(readReply(reply)?.chatId, "c1");
  assert.equal(readReply({ ...reply, signature_text: "z-ai/glm-5.3-flash:aa:bb" }), undefined);
  assert.equal(readReply({ ...reply, signing_address: "0x12" }), undefined);
  assert.equal(readPreflight(preflight)?.reportBytes, 287057);
  assert.equal(readPreflight({ ...preflight, report_bytes: 0 }), undefined);
  assert.equal(readPreflight({ ...preflight, nonce: "short" }), undefined);
  assert.equal(readPreflight("text"), undefined);
});

test("the preflight comes with the opening, and the verdict call with the answer that signed it", () => {
  const opened = mergeProof(null, { ok: true, blob: "b", model_proof: preflight });
  assert.equal(opened.preflight?.nonce, "a4".repeat(32));
  assert.equal(opened.verdictCall, undefined);
  const chat = mergeProof(opened, { ok: true, blob: "b2", reply: "hi", attestation, proof: reply });
  assert.equal(chat.verdictCall, undefined, "a chat answer is not the verdict");
  const signed = mergeProof(chat, { ok: true, blob: "b3", signature: "aa", verdict: { vault_id: "v" }, attestation, proof: reply });
  assert.equal(signed.verdictCall?.callId, call);
  assert.equal(signed.reply?.chatId, "c1");
  assert.equal(signed.preflight?.nonce, "a4".repeat(32));
});

test("a signed answer without evidence clears a stale verdict call and reply", () => {
  const signed = mergeProof(null, { ok: true, signature: "aa", verdict: { vault_id: "v" }, attestation, proof: reply });
  const again = mergeProof(signed, { ok: true, signature: "bb", verdict: { vault_id: "v" } });
  assert.equal(again.verdictCall, undefined);
  assert.equal(again.reply, undefined);
});
