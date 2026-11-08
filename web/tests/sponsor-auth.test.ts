import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthHeader, challengeMessage } from "../lib/sponsor-auth.ts";

test("the challenge names the domain, the route, the time, and a nonce", () => {
  assert.equal(new TextDecoder().decode(challengeMessage("/sponsor/seal", 1700000000, "ab12cd34ef56ab12")), "bouncer.sponsor.v1|/sponsor/seal|1700000000|ab12cd34ef56ab12");
});

test("the header carries the account, the key, the time, the nonce, and the signature of that message", () => {
  const seen: string[] = [];
  const header = buildAuthHeader({
    account: "ama.testnet", publicKey: "ed25519:key", route: "/sponsor/check", seconds: 5, nonce: "00112233aabbccdd",
    sign: (m) => (seen.push(new TextDecoder().decode(m)), new Uint8Array([1, 2, 3])),
  });
  assert.equal(header, "ama.testnet|ed25519:key|5|00112233aabbccdd|AQID");
  assert.deepEqual(seen, ["bouncer.sponsor.v1|/sponsor/check|5|00112233aabbccdd"]);
});
