import assert from "node:assert/strict";
import test from "node:test";
import { keyFromSeed } from "./device-pass.ts";
import { accessOnAccount, readPayoutAccount, testnetAccountId, writePayoutAccount } from "./imported-account.ts";

const RPC = "https://rpc.testnet.near.org";
const KEY = keyFromSeed(new Uint8Array(32).fill(4)).publicKey.toString();

test("a testnet name is kept and a mainnet name is refused", () => {
  assert.equal(testnetAccountId("  Alice.Testnet "), "alice.testnet");
  assert.equal(testnetAccountId("a".repeat(64)), "a".repeat(64));
  assert.equal(testnetAccountId("alice.near"), null);
  assert.equal(testnetAccountId("ab"), null);
  assert.equal(testnetAccountId("-alice.testnet"), null);
});

test("the stored payout name is the account id only", () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
  writePayoutAccount(storage, "bouncer", "alice.near");
  assert.equal(readPayoutAccount(storage, "bouncer"), null);
  writePayoutAccount(storage, "bouncer", "Alice.Testnet");
  assert.equal(readPayoutAccount(storage, "bouncer"), "alice.testnet");
  writePayoutAccount(storage, "bouncer", null);
  assert.equal(readPayoutAccount(storage, "bouncer"), null);
});

test("a full-access key is the only key that can sign", async () => {
  const full = await accessOnAccount(RPC, "alice.testnet", KEY, fake(accountView(), keyView("FullAccess")));
  const limited = await accessOnAccount(RPC, "alice.testnet", KEY, fake(accountView(), keyView({ FunctionCall: { method_names: ["claim"] } })));
  const missing = await accessOnAccount(RPC, "alice.testnet", KEY, fake(accountView(), { result: { error: "access key does not exist while viewing" } }));
  const absent = await accessOnAccount(RPC, "missing.testnet", KEY, fake({ error: { cause: { name: "UNKNOWN_ACCOUNT" } } }));
  assert.equal(full, "full");
  assert.equal(limited, "limited");
  assert.equal(missing, "missing");
  assert.equal(absent, "absent");
});

test("a failed read does not become permission", async () => {
  const unread = await accessOnAccount(RPC, "alice.testnet", KEY, async () => {
    throw new Error("down");
  });
  const badKey = await accessOnAccount(RPC, "alice.testnet", "ed25519:nope", async () => {
    throw new Error("should not be called");
  });
  assert.equal(unread, "unread");
  assert.equal(badKey, "unread");
});

function accountView() {
  return { result: { amount: "1" } };
}

function keyView(permission: unknown) {
  return { result: { nonce: 1, permission } };
}

function fake(...bodies: unknown[]): typeof fetch {
  const pending = [...bodies];
  return async () => ({ ok: true, json: async () => pending.shift() ?? null }) as Response;
}
