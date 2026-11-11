import assert from "node:assert/strict";
import test from "node:test";
import { KeyPair } from "near-api-js";
import { classifyKey, createKeyWatch, publicKeyOf } from "../src/key-scope.ts";

const expect = { receiver: "vault.test", methods: ["close_round", "commit_round"] };
const call = (receiver_id: string, method_names: string[], allowance: string | null = "1000000000000000000000000") => ({
  result: { nonce: 1, permission: { FunctionCall: { receiver_id, method_names, allowance } } },
});

test("only a function-call key on the vault with exactly the expected methods is scoped", () => {
  assert.equal(classifyKey(call("vault.test", ["commit_round", "close_round"]), expect), "scoped");
  assert.equal(classifyKey({ result: { nonce: 1, permission: "FullAccess" } }, expect), "full");
  assert.equal(classifyKey(call("vault.test", ["close_round"]), expect), "wrong");
  assert.equal(classifyKey(call("vault.test", ["close_round", "commit_round", "claim"]), expect), "wrong");
  // An empty method list means any method on the receiver.
  assert.equal(classifyKey(call("vault.test", []), expect), "wrong");
  assert.equal(classifyKey(call("other.test", ["close_round", "commit_round"]), expect), "wrong");
  assert.equal(classifyKey({ error: { cause: { name: "UNKNOWN_ACCESS_KEY" } } }, expect), "missing");
  assert.equal(classifyKey({ error: { cause: { name: "TIMEOUT_ERROR" } } }, expect), null);
});

function fakeRpc(answers: unknown[]) {
  const sent: unknown[] = [];
  const impl = (async (_url: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body));
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return { json: async () => next } as Response;
  }) as unknown as typeof fetch;
  return { impl, sent };
}

test("the watch reads the key it holds, refuses until scoped, keeps its answer through a failed read, and warns once when low", async () => {
  const pair = KeyPair.fromRandom("ed25519");
  const lines: string[] = [];
  const rpc = fakeRpc([
    { error: { cause: { name: "TIMEOUT_ERROR" } } },
    call("vault.test", ["close_round", "commit_round"]),
    new Error("down"),
    call("vault.test", ["close_round", "commit_round"], "100000000000000000000000"),
    call("vault.test", ["close_round", "commit_round"], "90000000000000000000000"),
    { result: { nonce: 1, permission: "FullAccess" } },
  ]);
  const watch = createKeyWatch("https://rpc.test", [{ name: "keeper", accountId: "keeper.test", privateKey: pair.toString(), expect }], 10n ** 24n, (l) => lines.push(l), rpc.impl);
  await watch.check();
  assert.equal(watch.ready("keeper"), false, "a first read that fails blocks");
  await watch.check();
  assert.equal(watch.ready("keeper"), true);
  assert.equal((rpc.sent[1] as { params: { public_key: string; account_id: string } }).params.public_key, publicKeyOf(pair.toString()));
  await watch.check();
  assert.equal(watch.ready("keeper"), true, "a failed read keeps the last answer");
  await watch.check();
  await watch.check();
  assert.equal(lines.filter((l) => l.includes("allowance is low")).length, 1);
  await watch.check();
  assert.equal(watch.ready("keeper"), false, "a full-access key is refused");
  assert.ok(lines.some((l) => l === "keeper key is full: refusing to use it"));
  assert.equal(lines.join("\n").includes(pair.toString()), false);
});

test("a key that cannot be parsed reads as missing", async () => {
  const watch = createKeyWatch("https://rpc.test", [{ name: "verdict", accountId: "relay.test", privateKey: "not-a-key", expect }], 10n ** 24n, () => {}, fakeRpc([]).impl);
  await watch.check();
  assert.equal(watch.ready("verdict"), false);
  assert.equal((watch.state() as Record<string, { state: string }>).verdict.state, "missing");
});
