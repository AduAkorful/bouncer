import assert from "node:assert/strict";
import test from "node:test";
import { httpRpc, readDoor } from "./chain.ts";
import { viewRequest } from "./vault.ts";

const request = viewRequest("vault.testnet", "get_owner", {});
const rpcBody = (value: unknown) => ({ result: { result: [...new TextEncoder().encode(JSON.stringify(value))] } });
const failure = { ok: false, error: "rpc" } as const;

test("RPC decodes a fresh read and uses a live transport signal", async () => {
  const rpc = httpRpc("https://rpc.invalid", async (_url, init) => {
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, JSON.stringify(request));
    assert.ok(init?.signal && !init.signal.aborted);
    return Response.json(rpcBody("owner.testnet"));
  });
  assert.deepEqual(await rpc(request), { ok: true, value: "owner.testnet" });
});

test("network, HTTP, invalid JSON and RPC errors never yield a value", async () => {
  for (const fetchImpl of [
    async () => { throw new Error("offline"); },
    async () => new Response("unavailable", { status: 503 }),
    async () => new Response("not json"),
    async () => Response.json({ error: { message: "unknown" } }),
  ]) {
    assert.deepEqual(await httpRpc("https://rpc.invalid", fetchImpl)(request), failure);
  }
});

test("a stalled fetch is aborted and a late successful response is discarded", async () => {
  let finish!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  const rpc = httpRpc("https://rpc.invalid", async (_url, init) => {
    signal = init?.signal;
    return new Promise<Response>((resolve) => { finish = resolve; });
  }, { timeoutMs: 20 });
  const pending = rpc(request);
  assert.deepEqual(await pending, failure);
  assert.equal(signal?.aborted, true);
  finish(Response.json(rpcBody("owner.testnet")));
  assert.deepEqual(await pending, failure);
});

test("the deadline includes stalled response bodies", async () => {
  let signal: AbortSignal | null | undefined;
  const rpc = httpRpc("https://rpc.invalid", async (_url, init) => {
    signal = init?.signal;
    return { ok: true, json: () => new Promise(() => {}) } as Response;
  }, { timeoutMs: 20 });
  assert.deepEqual(await rpc(request), failure);
  assert.equal(signal?.aborted, true);
});

test("the page signal cancels in-flight and future requests", async () => {
  const page = new AbortController();
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  const rpc = httpRpc("https://rpc.invalid", async (_url, init) => {
    calls++;
    signal = init?.signal;
    return new Promise<Response>(() => {});
  }, { signal: page.signal });
  const pending = rpc(request);
  page.abort();
  assert.deepEqual(await pending, failure);
  assert.equal(signal?.aborted, true);
  assert.deepEqual(await rpc(request), failure);
  assert.equal(calls, 1);
});

test("one failed parallel door view fails the entire read", async () => {
  const methods: string[] = [];
  const result = await readDoor(async (input) => {
    const method = (input.params as { method_name: string }).method_name;
    methods.push(method);
    return method === "get_owner" ? { ok: true, value: "owner.testnet" } : failure;
  }, "vault.testnet", "velvet-1");
  assert.deepEqual(methods.sort(), ["get_owner", "get_vault"]);
  assert.deepEqual(result, failure);
});
