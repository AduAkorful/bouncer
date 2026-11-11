import assert from "node:assert/strict";
import test from "node:test";
import { accountIdForPublicKey, sponsorNear } from "../lib/passkey-account.ts";

test("a passkey account id is stable and sits under the sponsor", async () => {
  const key = "ed25519:11111111111111111111111111111111";
  const first = await accountIdForPublicKey(key, "relay.aduakorful.testnet");
  const second = await accountIdForPublicKey(key, "relay.aduakorful.testnet");
  assert.equal(first, second);
  assert.match(first ?? "", /^p[0-9a-f]{12}\.relay\.aduakorful\.testnet$/);
  assert.equal(await accountIdForPublicKey("not-a-key", "relay.aduakorful.testnet"), null);
});

test("the sponsor sends two tenths of a NEAR", () => {
  assert.equal(sponsorNear(), 200_000_000_000_000_000_000_000n);
});
