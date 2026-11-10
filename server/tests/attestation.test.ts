import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CALL_ID, createAttestationLookup, outputText, sha256Hex, summarise } from "../src/attestation.ts";
import { createGuardPost } from "../src/guard-client.ts";
import { createApp } from "../src/app.ts";
import { testDeps } from "./testkit.ts";

// A real attestation OutLayer published on 10 Nov 2026 for one `pubkey` call (the quote is shortened).
const REAL = JSON.parse(readFileSync(new URL("./fixtures/attestation-pubkey-call.json", import.meta.url), "utf8"));
const CALL = "16df134e-f31e-4f0a-a035-9dc7373c0017";
const OUTPUT = { ok: true, public_key: "226820e9f906090156e608dd1eaa56faf0a30c720b01bee613c8b968fbee67d3" };

test("the answer the server saw hashes to what OutLayer attested", () => {
  // The guard's compact JSON, as it was hashed by the worker.
  assert.equal(sha256Hex(outputText(OUTPUT)!), REAL.output_hash);
  assert.equal(sha256Hex('{"op":"pubkey"}'), REAL.input_hash);
});

test("a real attestation is summarised, and the quote is hashed rather than carried", () => {
  const s = summarise(REAL, CALL)!;
  assert.equal(s.wasm_hash, "7260b0cdb4ef453b564024c1c4ac034cf5ed745a5f9d5aab0f1350d67f6adf1f");
  assert.equal(s.project_id, "aduakorful-door.testnet/guard");
  assert.equal(s.quote_sha256, sha256Hex(REAL.tdx_quote));
  assert.ok(!JSON.stringify(s).includes(REAL.tdx_quote));
});

test("a record for another call, or with a malformed hash, or no quote, is nothing", () => {
  assert.equal(summarise(REAL, "00000000-0000-4000-8000-000000000000"), null);
  assert.equal(summarise({ ...REAL, output_hash: "abc" }, CALL), null);
  assert.equal(summarise({ ...REAL, tdx_quote: "" }, CALL), null);
  assert.equal(summarise(null, CALL), null);
  assert.equal(summarise("text", CALL), null);
});

test("only a call id shape reaches OutLayer, a 404 is pending, and a good answer is kept", async () => {
  let calls = 0;
  let status = 404;
  const seen: string[] = [];
  const fetchImpl = (async (url: URL) => {
    calls += 1;
    seen.push(String(url));
    return status === 200 ? Response.json(REAL) : new Response("", { status });
  }) as unknown as typeof fetch;
  let t = 0;
  const lookup = createAttestationLookup("https://testnet-api.outlayer.ai/call/a/b", () => t, fetchImpl);
  assert.deepEqual(await lookup("../../etc/passwd"), { ok: false, pending: false });
  assert.equal(calls, 0);
  assert.deepEqual(await lookup(CALL), { ok: false, pending: true });
  assert.equal(seen[0], `https://testnet-api.outlayer.ai/attestations/by-call/${CALL}`);
  status = 200;
  const first = await lookup(CALL);
  assert.ok(first.ok);
  const before = calls;
  assert.ok((await lookup(CALL)).ok);
  assert.equal(calls, before);
  t = 11 * 60_000;
  assert.ok((await lookup(CALL)).ok);
  assert.equal(calls, before + 1);
  status = 500;
  assert.deepEqual(await createAttestationLookup("https://x.test", () => 0, fetchImpl)(CALL), { ok: false, pending: false });
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

test("/proof answers pending, then the summary with the pin, and refuses a bad id", async () => {
  let known = false;
  const { deps } = testDeps({
    attest: async (id) => (id !== CALL ? { ok: false, pending: false } : known ? { ok: true, attestation: summarise(REAL, CALL)! } : { ok: false, pending: true }),
  });
  const app = createApp(deps);
  assert.equal((await app.request("/proof/not-an-id")).status, 404);
  const pending = await app.request(`/proof/${CALL}`);
  assert.equal(pending.status, 202);
  assert.deepEqual(await pending.json(), { ok: false, pending: true });
  known = true;
  const done = await app.request(`/proof/${CALL}`);
  assert.equal(done.status, 200);
  const body = (await done.json()) as { ok: boolean; attestation: { wasm_hash: string }; pinned: string };
  assert.equal(body.attestation.wasm_hash, REAL.wasm_hash);
  assert.equal(body.pinned, deps.env.guard.versionKey);
  assert.ok(CALL_ID.test(CALL));
  const none = createApp(testDeps({ attest: undefined }).deps);
  assert.equal((await none.request(`/proof/${CALL}`)).status, 404);
});
