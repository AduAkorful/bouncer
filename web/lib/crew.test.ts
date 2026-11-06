import assert from "node:assert/strict";
import test from "node:test";
import { bondFromPolicy, buildAddProposal, buildCreateCrew, councilFromPolicy, evenSplit, policyShares, readStoredCrew } from "./crew.ts";
import { acceptCrewPost, type CrewRoom } from "./crew-relay.ts";
import { readCrewEnv } from "./config.ts";

const ONE_NEAR = "1000000000000000000000000";
const TENTH_NEAR = "100000000000000000000000";

const env = {
  factoryId: "factory.testnet",
  depositYocto: "6" + "0".repeat(24),
  gas: "150000000000000",
};

test("a missing factory, deposit, or bond does not build a transaction", () => {
  assert.equal(buildCreateCrew(null, "lions", ["a.testnet", "b.testnet"]).ok, false);
  assert.equal(buildCreateCrew({ ...env, factoryId: "" }, "lions", ["a.testnet", "b.testnet"]).ok, false);
  assert.equal(buildCreateCrew({ ...env, depositYocto: "" }, "lions", ["a.testnet", "b.testnet"]).ok, false);
  const missing = readCrewEnv({});
  assert.equal(missing.ok, false);
  assert.equal(buildAddProposal(null, "split", { FunctionCall: {} }).ok, false);
  assert.equal(bondFromPolicy({}), null);
});

test("a stored crew id is shown only when it is a safe account", () => {
  const storage = new Map<string, string>();
  const box = { getItem: (key: string) => storage.get(key) ?? null };
  assert.equal(readStoredCrew(box, "bouncer"), null);
  storage.set("bouncer.crew-dao", "bad id");
  assert.equal(readStoredCrew(box, "bouncer"), null);
  storage.set("bouncer.crew-dao", "lions.sputnikv2.testnet");
  assert.equal(readStoredCrew(box, "bouncer"), "lions.sputnikv2.testnet");
  assert.equal(readStoredCrew({ getItem: () => { throw new Error("blocked"); } }, "bouncer"), null);
});

test("a policy read supplies the council and a failed read supplies none", () => {
  const policy = { roles: [{ name: "council", kind: { Group: ["a.testnet", "b.testnet"] } }] };
  assert.deepEqual(councilFromPolicy(policy), { ok: true, members: ["a.testnet", "b.testnet"] });
  assert.deepEqual(councilFromPolicy({ Current: policy }), { ok: true, members: ["a.testnet", "b.testnet"] });
  assert.deepEqual(councilFromPolicy({ roles: [{ name: "council", kind: "Everyone" }] }), { ok: false });
  assert.deepEqual(councilFromPolicy({}), { ok: false });
  assert.deepEqual(councilFromPolicy(null), { ok: false });
});

test("the bond attached is the value read from the policy", () => {
  const bond = bondFromPolicy({ proposal_bond: ONE_NEAR });
  const built = buildAddProposal(bond, "claim", { FunctionCall: { receiver_id: "vault.testnet", actions: [] } });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.equal(built.call.depositYocto, ONE_NEAR);
  assert.notEqual(built.call.depositYocto, TENTH_NEAR);
  const wrapped = bondFromPolicy({ Current: { proposal_bond: ONE_NEAR } });
  assert.equal(wrapped, ONE_NEAR);
});

test("an even split leaves a remainder unallocated", () => {
  const shares = evenSplit(10n, 3);
  assert.deepEqual(shares, [3n, 3n, 3n]);
  assert.equal(policyShares(1000n, [4000n, 3000n, 2000n]), null);
  assert.deepEqual(policyShares(1000n, [4000n, 3000n, 3000n]), [400n, 300n, 300n]);
});

test("the relay refuses a bill signed by someone other than the biller and makes no guard call", () => {
  const room: CrewRoom = { joined: ["a", "b"], biller: "a", transcript: [] };
  const verify = (signer: string, _message: string, signature: string) => signature === `ok:${signer}`;
  const refused = acceptCrewPost(room, { kind: "bill", signer: "b", message: "bill", signature: "ok:b" }, verify);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.equal(refused.callGuard, false);
});

test("the relay refuses a chat post whose signature is not a joined key", () => {
  const room: CrewRoom = { joined: ["a"], biller: "a", transcript: [] };
  const verify = (signer: string, _message: string, signature: string) => signature === `ok:${signer}`;
  const outsider = acceptCrewPost(room, { kind: "chat", signer: "c", message: "hello", signature: "ok:c" }, verify);
  assert.equal(outsider.ok, false);
  if (!outsider.ok) assert.equal(outsider.callGuard, false);
  const forged = acceptCrewPost(room, { kind: "chat", signer: "a", message: "hello", signature: "no" }, verify);
  assert.equal(forged.ok, false);
  const said = acceptCrewPost(room, { kind: "chat", signer: "a", message: "hello", signature: "ok:a" }, verify);
  assert.equal(said.ok, true);
  if (said.ok) assert.equal(said.callGuard, false);
  assert.deepEqual(room.transcript, ["hello"]);
});
