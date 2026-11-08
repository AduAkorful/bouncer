import assert from "node:assert/strict";
import test from "node:test";
import { planTransfer } from "../lib/wallet-move.ts";

const base = {
  networkId: "testnet",
  tokenId: "usdc.fakes.testnet",
  to: "ada.testnet",
  amountText: "1.50",
  decimals: 6,
  balance: 2_000_000n,
};

test("a transfer plans the token amount the account can pay", () => {
  const planned = planTransfer(base);
  assert.equal(planned.ok, true);
  if (planned.ok) assert.equal(planned.amount, 1_500_000n);
});

test("a transfer is refused when the amount, the account, or the network cannot be used", () => {
  assert.equal(planTransfer({ ...base, networkId: "mainnet" }).ok, false);
  assert.equal(planTransfer({ ...base, to: "ada.near" }).ok, false);
  assert.equal(planTransfer({ ...base, amountText: "0" }).ok, false);
  assert.equal(planTransfer({ ...base, amountText: "1.1234567" }).ok, false);
  assert.equal(planTransfer({ ...base, balance: 1n }).ok, false);
  assert.equal(planTransfer({ ...base, tokenId: "" }).ok, false);
});
