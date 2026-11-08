import assert from "node:assert/strict";
import test from "node:test";
import { guestCanSubmit, parseRpcJson, parseVault, type VaultView } from "../lib/vault.ts";

function sample(over: Partial<Record<string, unknown>> = {}) {
  const bytes = Array.from({ length: 32 }, (_, i) => i);
  return {
    sponsor: "sponsor.testnet",
    pot: "0",
    day_pot: "1",
    reserved: "0",
    cap: "1000000000",
    lock_ns: "60000000000",
    rule: "PayTheBill",
    guard_pk: bytes,
    commitment: bytes,
    guard_version: bytes,
    round: "1",
    opens_at: "1",
    closes_at: "2",
    open: true,
    challenge_end: null,
    max_cracks: 10,
    ticketed: false,
    closed_pending_bump: false,
    refund_in_flight: "0",
    crack_count: 0,
    ...over,
  };
}

test("a vault view may encode amounts as safe integers", () => {
  const parsed = parseVault(
    sample({
      pot: 0,
      day_pot: 0,
      reserved: 0,
      cap: 1,
      lock_ns: 60_000_000_000,
      round: 1,
      opens_at: 0,
      closes_at: 0,
      refund_in_flight: 0,
      open: false,
      commitment: null,
      guard_version: null,
    }),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.vault.pot, "0");
  assert.equal(parsed.vault.cap, "1");
  assert.equal(parsed.vault.lockNs, "60000000000");
  assert.equal(parsed.vault.open, false);
  assert.equal(parsed.vault.commitment, null);
});

test("a nanosecond timestamp survives the rpc parse", () => {
  const json =
    '{"opens_at":1793551532429035520,"closes_at":1793577600000000000,"pot":0,"note":"1793551532429035520"}';
  const parsed = parseRpcJson({ result: { result: Array.from(Buffer.from(json)) } });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const value = parsed.value as { opens_at: string; closes_at: string; pot: number; note: string };
  assert.equal(value.opens_at, "1793551532429035520");
  assert.equal(value.closes_at, "1793577600000000000");
  assert.equal(value.pot, 0);
  assert.equal(value.note, "1793551532429035520");
});

test("an amount that is not a whole safe integer is not a vault", () => {
  assert.equal(parseVault(sample({ pot: 1.5 })).ok, false);
  assert.equal(parseVault(sample({ cap: Number.MAX_SAFE_INTEGER + 2 })).ok, false);
});

test("a vault view with a missing field is not a vault", () => {
  const row = sample();
  delete (row as { day_pot?: string }).day_pot;
  assert.equal(parseVault(row).ok, false);
  assert.equal(parseVault(null).ok, false);
});

test("a ticketed vault is not submitted by the relay", () => {
  const parsed = parseVault(sample({ ticketed: true }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(guestCanSubmit(parsed.vault, "owner.testnet", "relay.testnet"), { ok: false, error: "ticketed" });
});

test("the relay does not submit when it is the owner", () => {
  const parsed = parseVault(sample());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const vault: VaultView = parsed.vault;
  assert.deepEqual(guestCanSubmit(vault, "relay.testnet", "relay.testnet"), { ok: false, error: "relay is owner" });
  assert.equal(guestCanSubmit(vault, "owner.testnet", "relay.testnet").ok, true);
});
