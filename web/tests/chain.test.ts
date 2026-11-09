import assert from "node:assert/strict";
import test from "node:test";
import { httpRpc, readDoor } from "../lib/chain.ts";
import { viewRequest } from "../lib/vault.ts";

const request = viewRequest("vault.testnet", "get_owner", {});
const rpcBody = (value: unknown) => ({ result: { result: [...new TextEncoder().encode(JSON.stringify(value))] } });
const failure = { ok: false, error: "rpc" } as const;
const quick = { retryDelaysMs: [0, 0], log: () => {} };

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
    assert.deepEqual(await httpRpc("https://rpc.invalid", fetchImpl, quick)(request), failure);
  }
});

test("a stalled fetch is aborted and a late successful response is discarded", async () => {
  let finish!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  const rpc = httpRpc("https://rpc.invalid", async (_url, init) => {
    signal = init?.signal;
    return new Promise<Response>((resolve) => { finish = resolve; });
  }, { ...quick, timeoutMs: 20 });
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
  }, { ...quick, timeoutMs: 20 });
  assert.deepEqual(await rpc(request), failure);
  assert.equal(signal?.aborted, true);
});

test("one rpc failure is tried once more", async () => {
  let calls = 0;
  const rpc = httpRpc("https://rpc.invalid", async () => {
    calls += 1;
    if (calls === 1) return new Response("unavailable", { status: 503 });
    return Response.json(rpcBody("owner.testnet"));
  }, quick);
  assert.deepEqual(await rpc(request), { ok: true, value: "owner.testnet" });
  assert.equal(calls, 2);
});

test("three refused reads stay a failure and are logged with their reasons", async () => {
  let calls = 0;
  const lines: string[] = [];
  const rpc = httpRpc("https://rpc.invalid", async () => {
    calls += 1;
    return new Response("slow down", { status: 429 });
  }, { retryDelaysMs: [0, 0], log: (line) => lines.push(line) });
  assert.deepEqual(await rpc(request), failure);
  assert.equal(calls, 3);
  assert.deepEqual(lines, ["rpc read failed: get_owner · rpc.invalid http 429, rpc.invalid http 429, rpc.invalid http 429"]);
});

test("the last try goes to the fallback endpoint", async () => {
  const urls: string[] = [];
  const rpc = httpRpc("https://rpc.invalid", async (url) => {
    urls.push(String(url));
    if (String(url) === "https://fallback.invalid") return Response.json(rpcBody("owner.testnet"));
    return new Response("slow down", { status: 429 });
  }, { ...quick, fallbackUrl: "https://fallback.invalid" });
  assert.deepEqual(await rpc(request), { ok: true, value: "owner.testnet" });
  assert.deepEqual(urls, ["https://rpc.invalid", "https://rpc.invalid", "https://fallback.invalid"]);
});

test("a busy node error is tried again; a missing account is not", async () => {
  let calls = 0;
  const busy = httpRpc("https://rpc.invalid", async () => {
    calls += 1;
    return calls === 1 ? Response.json({ error: { cause: { name: "TIMEOUT_ERROR" } } }) : Response.json(rpcBody("owner.testnet"));
  }, quick);
  assert.deepEqual(await busy(viewRequest("vault.testnet", "get_owner", { n: 1 })), { ok: true, value: "owner.testnet" });
  calls = 0;
  const missing = httpRpc("https://rpc.invalid", async () => {
    calls += 1;
    return Response.json({ error: { cause: { name: "UNKNOWN_ACCOUNT" } } });
  }, quick);
  assert.deepEqual(await missing(viewRequest("vault.testnet", "get_owner", { n: 2 })), failure);
  assert.equal(calls, 1);
});

test("an aborted page does not start a second call", async () => {
  const page = new AbortController();
  let calls = 0;
  const rpc = httpRpc("https://rpc.invalid", async () => {
    calls += 1;
    page.abort();
    return new Response("unavailable", { status: 503 });
  }, { ...quick, signal: page.signal });
  assert.deepEqual(await rpc(request), failure);
  assert.equal(calls, 1);
});

test("two identical view calls share one request", async () => {
  let calls = 0;
  const rpc = httpRpc("https://rpc.invalid", async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return Response.json(rpcBody("owner.testnet"));
  });
  const [first, second] = await Promise.all([rpc(request), rpc(request)]);
  assert.deepEqual(first, { ok: true, value: "owner.testnet" });
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test("the page signal cancels in-flight and future requests", async () => {
  const page = new AbortController();
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  const rpc = httpRpc("https://rpc.invalid", async (_url, init) => {
    calls++;
    signal = init?.signal;
    return new Promise<Response>(() => {});
  }, { ...quick, signal: page.signal });
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

test("a page client reuses a good answer, and a long-lived client does not", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(JSON.stringify(rpcBody("owner.testnet")), { status: 200 });
  }) as typeof fetch;
  const page = httpRpc("https://rpc.example", fetchImpl, { ...quick, keep: true });
  assert.equal((await page(request)).ok, true);
  assert.equal((await page(request)).ok, true);
  assert.equal(calls, 1);
  const server = httpRpc("https://rpc.example", fetchImpl, quick);
  await server(request);
  await server(request);
  assert.equal(calls, 3);
});
