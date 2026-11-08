import assert from "node:assert/strict";
import test from "node:test";
import { payoutExplorerUrl } from "../lib/explorer.ts";

test("a payment hash links to the testnet explorer", () => {
  const hash = "5Zx7k3mN8pQrStUvWxYz2aBcDeFgHiJkLmNoPqRsTuV";
  assert.equal(payoutExplorerUrl(hash), `https://testnet.nearblocks.io/txns/${hash}`);
});

test("a payment link is refused for a bad hash", () => {
  assert.equal(payoutExplorerUrl(""), null);
  assert.equal(payoutExplorerUrl("https://evil.example/tx"), null);
  assert.equal(payoutExplorerUrl("0OIl"), null);
});
