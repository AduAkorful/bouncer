import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { outputText, sha256Hex } from "../src/attestation.ts";
import { createGuardPost } from "../src/guard-client.ts";

// A real attestation OutLayer published on 10 Nov 2026 for one `pubkey` call (the quote is shortened).
const REAL = JSON.parse(readFileSync(new URL("../../web/tests/fixtures/attestation-pubkey-call.json", import.meta.url), "utf8"));
const CALL = "16df134e-f31e-4f0a-a035-9dc7373c0017";
const OUTPUT = { ok: true, public_key: "226820e9f906090156e608dd1eaa56faf0a30c720b01bee613c8b968fbee67d3" };

test("the answer the server saw hashes to what OutLayer attested", () => {
  // The guard's compact JSON, as it was hashed by the worker.
  assert.equal(sha256Hex(outputText(OUTPUT)!), REAL.output_hash);
  assert.equal(sha256Hex('{"op":"pubkey"}'), REAL.input_hash);
});

test("the guard post keeps the call id, the attestation link, and the hash of the output it read", async () => {
  const wrapper = { call_id: CALL, status: "completed", output: OUTPUT, attestation_url: `/attestations/by-call/${CALL}` };
  const post = createGuardPost((async () => Response.json(wrapper)) as unknown as typeof fetch);
  const result = await post({ url: "https://testnet-api.outlayer.ai/call/a/b", headers: { "content-type": "application/json", "x-payment-key": "k" }, body: { input: { op: "pubkey" }, version_key: "v", max_execution_seconds: 1, max_memory_mb: 1 } });
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.attestation?.callId, CALL);
    assert.equal(result.attestation?.url, `https://testnet-api.outlayer.ai/attestations/by-call/${CALL}`);
    assert.equal(result.attestation?.outputSha256, REAL.output_hash);
  }
});
