import test from "node:test";
import assert from "node:assert/strict";
import { sponsorAvailability } from "./sponsor-availability.ts";
import type { Rpc } from "./chain.ts";

const limits = { self_serve: true, max_cap: "5000000", max_cracks: 4, min_lock_ns: "60000000000", max_lock_ns: "86400000000000", max_card: 600, max_spec_ct: 10000, max_open_lead_ns: "86400000000000", default_guard_pk: null, reserved_prefixes: ["velvet"] };
test("availability reads current limits and reports unknown for failed or malformed reads", async () => {
  let current: unknown = limits;
  const rpc: Rpc = async (request) => {
    assert.equal(request.params.method_name, "get_limits");
    return { ok: true, value: current };
  };
  assert.equal(await sponsorAvailability(rpc, "vault.testnet"), "open");
  current = { ...limits, self_serve: false };
  assert.equal(await sponsorAvailability(rpc, "vault.testnet"), "closed");
  current = { self_serve: true };
  assert.equal(await sponsorAvailability(rpc, "vault.testnet"), "unknown");
  assert.equal(await sponsorAvailability(async () => ({ ok: false, error: "rpc" }), "vault.testnet"), "unknown");
  assert.equal(await sponsorAvailability(async () => { throw new Error("offline"); }, "vault.testnet"), "unknown");
});
