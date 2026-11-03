import assert from "node:assert/strict";
import test from "node:test";
import { accountIdForPublicKey, signatureOutcome, signPayloadBytes, sponsorNear } from "./passkey-account.ts";

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

test("a signature payload stays a byte list", () => {
  assert.deepEqual(signPayloadBytes([1, 2, 3]), [1, 2, 3]);
  assert.deepEqual(signPayloadBytes(Buffer.from([9, 8]).toString("base64")), [9, 8]);
  assert.deepEqual(signPayloadBytes(Buffer.from([251, 255]).toString("base64url")), [251, 255]);
  assert.equal(signPayloadBytes("hello"), null);
});

test("the signature is taken from the callback receipt", () => {
  const lifted = signatureOutcome({
    status: { SuccessReceiptId: "abc" },
    receipts_outcome: [{ outcome: { status: { SuccessValue: "eyJzaWduYXR1cmUiOlsxXX0=" } } }],
  });
  assert.equal(lifted?.status.SuccessValue, "eyJzaWduYXR1cmUiOlsxXX0=");
  assert.equal(signatureOutcome({ status: { SuccessValue: "bnVsbA==" }, receipts_outcome: [] }), null);
});
