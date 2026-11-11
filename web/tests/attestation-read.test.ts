import assert from "node:assert/strict";
import test from "node:test";
import { attestationUrl, readAttestation, summariseAttestation } from "../lib/attestation-read.ts";

const CALL = "16df134e-f31e-4f0a-a035-9dc7373c0017";
const record = {
  call_id: CALL, project_id: "p", wasm_hash: "ab".repeat(32), executed_wasm_sha256: "ab".repeat(32),
  input_hash: "cd".repeat(32), output_hash: "ef".repeat(32), worker_measurement: "m", timestamp: 5, tdx_quote: "0011",
};
const answer = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("the browser keeps OutLayer's record only when it names the call and is well formed", async () => {
  const kept = await summariseAttestation(record, CALL);
  assert.equal(kept?.wasm_hash, "ab".repeat(32));
  assert.equal(kept?.quote_bytes, 2);
  assert.match(kept?.quote_sha256 ?? "", /^[0-9a-f]{64}$/);
  assert.equal(await summariseAttestation({ ...record, call_id: "x" }, CALL), null);
  assert.equal(await summariseAttestation({ ...record, output_hash: "short" }, CALL), null);
  assert.equal(await summariseAttestation({ ...record, tdx_quote: "" }, CALL), null);
});

test("the attestation is read from OutLayer's own address, and a 404 means not yet", async () => {
  assert.equal(attestationUrl("https://api.test/", CALL), `https://api.test/attestations/by-call/${CALL}`);
  assert.equal(attestationUrl("https://api.test", "../x"), null);
  assert.deepEqual(await readAttestation("https://api.test", CALL, answer(404, {})), { ok: false, pending: true });
  assert.deepEqual(await readAttestation("https://api.test", CALL, answer(500, {})), { ok: false, pending: false });
  const read = await readAttestation("https://api.test", CALL, answer(200, record));
  assert.equal(read.ok, true);
});

test("a real OutLayer attestation is summarised in the browser, with the quote hashed rather than carried", async () => {
  const { readFileSync } = await import("node:fs");
  const real = JSON.parse(readFileSync(new URL("./fixtures/attestation-pubkey-call.json", import.meta.url), "utf8"));
  const kept = await summariseAttestation(real, real.call_id);
  assert.ok(kept);
  assert.equal(kept.wasm_hash, real.wasm_hash);
  assert.equal(kept.output_hash, real.output_hash);
  assert.equal(kept.quote_bytes, real.tdx_quote.length / 2);
  assert.equal(JSON.stringify(kept).includes(real.tdx_quote), false);
});
