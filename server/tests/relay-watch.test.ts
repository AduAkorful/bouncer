import assert from "node:assert/strict";
import test from "node:test";
import { createRelayWatch } from "../src/relay-watch.ts";
import { createApp } from "../src/app.ts";
import { testDeps } from "./testkit.ts";

const balance = (amount: string): typeof fetch => (async () => new Response(JSON.stringify({ result: { amount } }))) as unknown as typeof fetch;

test("the relay watch says low under 1 NEAR, logs once, and recovers", async () => {
  const lines: string[] = [];
  let amount = "50000000000000000000000";
  const watch = createRelayWatch("http://rpc", "relay.test", (l) => lines.push(l), (async () => new Response(JSON.stringify({ result: { amount } }))) as unknown as typeof fetch);
  assert.deepEqual(watch.state(), { checked: false, low: false });
  assert.equal((await watch.check()).low, true);
  await watch.check();
  assert.equal(lines.length, 1);
  amount = "2000000000000000000000000";
  assert.deepEqual(await watch.check(), { checked: true, low: false });
});

test("a failed read leaves the last answer, and /status carries the relay state", async () => {
  const watch = createRelayWatch("http://rpc", "relay.test", () => undefined, (async () => { throw new Error("down"); }) as unknown as typeof fetch);
  assert.deepEqual(await watch.check(), { checked: false, low: false });
  void balance;
  const { deps } = testDeps({ status: () => ({ keeper: {}, relay: { checked: true, low: true } }) });
  const body = (await (await createApp(deps).request("/status")).json()) as { relay: { low: boolean } };
  assert.equal(body.relay.low, true);
});
