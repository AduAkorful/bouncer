import assert from "node:assert/strict";
import test from "node:test";
import { asObject, postJson, readApiBase } from "./api.ts";

const reply = (status: number, body: unknown = { ok: true }) => new Response(JSON.stringify(body), { status });

test("the server address must be an origin", () => {
  assert.equal(readApiBase("https://api.example.com"), "https://api.example.com");
  assert.equal(readApiBase(" http://localhost:8787 "), "http://localhost:8787");
  assert.equal(readApiBase("https://api.example.com/path"), null);
  assert.equal(readApiBase(""), null);
  assert.equal(readApiBase(undefined), null);
});

test("no server address means no call", async () => {
  let called = false;
  const out = await postJson(null, (async () => ((called = true), reply(200))) as typeof fetch, "/guard", {});
  assert.deepEqual(out, { ok: false, error: "no server" });
  assert.equal(called, false);
});

test("one retry on a network error or a 5xx with the same body, none on a 4xx", async () => {
  const bodies: string[] = [];
  let n = 0;
  const flaky = (async (_url: unknown, init: RequestInit) => {
    bodies.push(String(init.body));
    return ++n === 1 ? Promise.reject(new Error("net")) : reply(200, { ok: true, blob: "b" });
  }) as typeof fetch;
  const ok = await postJson("https://s.test", flaky, "/guard", { op: "say" });
  assert.deepEqual(ok, { ok: true, status: 200, body: { ok: true, blob: "b" } });
  assert.equal(bodies[0], bodies[1]);
  n = 0;
  const five = await postJson("https://s.test", (async () => (++n === 1 ? reply(502) : reply(200))) as typeof fetch, "/guard", {});
  assert.equal(five.ok, true);
  n = 0;
  const four = await postJson("https://s.test", (async () => (++n, reply(409, { ok: false, error: "stale blob" }))) as typeof fetch, "/guard", {});
  assert.deepEqual(four, { ok: true, status: 409, body: { ok: false, error: "stale blob" } });
  assert.equal(n, 1);
  n = 0;
  const dead = await postJson("https://s.test", (async () => (++n, Promise.reject(new Error("net")))) as typeof fetch, "/guard", {});
  assert.equal(dead.ok, false);
  assert.equal(n, 2);
});

test("a transport failure reads as the flat guard failure", () => {
  assert.deepEqual(asObject({ ok: false, error: "network" }), { ok: false, error: "guard" });
  assert.deepEqual(asObject({ ok: true, status: 200, body: [1] }), { ok: false, error: "guard" });
  assert.deepEqual(asObject({ ok: true, status: 200, body: { ok: true } }), { ok: true });
});
