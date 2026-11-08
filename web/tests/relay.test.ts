import assert from "node:assert/strict";
import test from "node:test";
import { readGuardEnv } from "../lib/config.ts";
import { buildOutlayerRequest, readGuardOutput } from "../lib/relay.ts";

const env = {
  callUrl: "https://relay.example/call/owner/project",
  paymentKey: "owner:1:secret",
  versionKey: "ab".repeat(32),
  maxExecutionSeconds: 120,
  maxMemoryMb: 128,
};

test("the relay builder pins the hash and the payment key, and drops client credentials", () => {
  const built = buildOutlayerRequest(env, {
    op: "say",
    blob: "blob-1",
    version_key: "ff".repeat(32),
    secrets_ref: "guard",
    Authorization: "Bearer wk_client",
    "X-Payment-Key": "client:1:nope",
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.equal(built.call.body.version_key, env.versionKey);
  assert.equal(built.call.headers["x-payment-key"], env.paymentKey);
  assert.equal("authorization" in built.call.headers, false);
  assert.equal(built.call.body.input.version_key, undefined);
  assert.equal(built.call.body.input.secrets_ref, undefined);
  assert.equal(built.call.body.input.Authorization, undefined);
  assert.equal(built.call.body.input.blob, "blob-1");
  assert.deepEqual(Object.keys(built.call.headers).sort(), ["content-type", "x-payment-key"]);
});

test("the raid reads the guard object inside the call wrapper", () => {
  const wrapped = readGuardOutput({
    status: "completed",
    output: { ok: true, blob: "sealed", used: 0 },
  });
  assert.equal(wrapped.ok, true);
  if (!wrapped.ok) return;
  assert.deepEqual(wrapped.body, { ok: true, blob: "sealed", used: 0 });
  const text = readGuardOutput({ status: "completed", output: '{"ok":true,"blob":"sealed"}' });
  assert.equal(text.ok, true);
  if (!text.ok) return;
  assert.deepEqual(text.body, { ok: true, blob: "sealed" });
  assert.deepEqual(readGuardOutput({ status: "failed" }), { ok: false, error: "guard" });
});

test("a missing env object does not produce a request", () => {
  assert.equal(buildOutlayerRequest(null, { op: "open" }).ok, false);
  assert.equal(buildOutlayerRequest(undefined, { op: "open" }).ok, false);
  const partial = readGuardEnv({});
  assert.equal(partial.ok, false);
  if (!partial.ok) assert.equal(buildOutlayerRequest(null, { op: "open" }).ok, false);
});
