import assert from "node:assert/strict";
import test from "node:test";
import { baseDecode } from "near-api-js";
import { deriveSecrets, importClaimKey, keyFromSeed, unlockDevice } from "./device-pass.ts";

test("the same passkey bytes rebuild the same account, claim key, and raid", async () => {
  const ikm = new Uint8Array(32).map((_, i) => i + 1);
  const first = await deriveSecrets(ikm, "velvet-1", "1");
  const second = await deriveSecrets(ikm, "velvet-1", "1");
  assert.ok(!("error" in first));
  assert.ok(!("error" in second));
  assert.equal(first.accountPublicKey, second.accountPublicKey);
  assert.equal(first.claimPublicKeyHex, second.claimPublicKeyHex);
  assert.equal(first.raidId, second.raidId);
  assert.notEqual(first.accountPublicKey, first.claimPublicKeyHex);
  assert.equal(first.raidId.length, 32);
});

test("a different round is a different raid id and the same account", async () => {
  const ikm = new Uint8Array(32).map((_, i) => i + 3);
  const one = await deriveSecrets(ikm, "velvet-1", "1");
  const two = await deriveSecrets(ikm, "velvet-1", "2");
  assert.ok(!("error" in one) && !("error" in two));
  assert.equal(one.accountPublicKey, two.accountPublicKey);
  assert.notEqual(one.raidId, two.raidId);
});

test("a short passkey result is refused", async () => {
  const derived = await deriveSecrets(new Uint8Array(16), "velvet-1", "1");
  assert.deepEqual(derived, { error: "passkey" });
});

test("the claim key in the browser matches the key the vault will check", async () => {
  const ikm = new Uint8Array(32).fill(9);
  const secrets = await deriveSecrets(ikm, "velvet-1", "4");
  assert.ok(!("error" in secrets));
  const seed = baseDecode(secrets.claimSecret.slice("ed25519:".length)).slice(0, 32);
  const stored = await importClaimKey(seed);
  const message = new Uint8Array([9, 8, 7]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, stored, message));
  assert.equal(keyFromSeed(seed).verify(message, signature), true);
  assert.equal(keyFromSeed(seed).publicKey.toString().startsWith("ed25519:"), true);
});

test("signing in asks for a passkey, not an empty security-key list", async () => {
  class Credential {
    rawId = new ArrayBuffer(16);
    getClientExtensionResults() { return { prf: { results: { first: new Uint8Array(32).buffer } } }; }
  }
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const credentialDescriptor = Object.getOwnPropertyDescriptor(globalThis, "PublicKeyCredential");
  const credentialsDescriptor = Object.getOwnPropertyDescriptor(navigator, "credentials");
  let options: PublicKeyCredentialRequestOptions | undefined;
  let gets = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { PublicKeyCredential: Credential, location: { hostname: "localhost" } } });
  Object.defineProperty(globalThis, "PublicKeyCredential", { configurable: true, value: Credential });
  Object.defineProperty(navigator, "credentials", { configurable: true, value: {
    get: async (request: CredentialRequestOptions) => {
      gets += 1;
      options = request.publicKey;
      return new Credential();
    },
    create: async () => { throw new Error("sign-in must not create a passkey"); },
  } });
  try {
    try { localStorage.setItem("bouncer.passkey.credential.v1", "00112233445566778899aabbccddeeff"); } catch { /* no browser store in this test */ }
    const unlocked = await unlockDevice();
    assert.ok("ikm" in unlocked);
    unlocked.ikm.fill(0);
    assert.equal(gets, 1);
    assert.equal(options?.allowCredentials, undefined);
    assert.equal("hints" in (options ?? {}), false);
    assert.ok(options?.extensions && "prf" in options.extensions);
  } finally {
    for (const [target, key, descriptor] of [[globalThis, "window", windowDescriptor], [globalThis, "PublicKeyCredential", credentialDescriptor], [navigator, "credentials", credentialsDescriptor]] as const) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  }
});

test("the account key signs with the seed it was given", () => {
  const seed = new Uint8Array(32).fill(7);
  const key = keyFromSeed(seed);
  const signature = key.sign(new Uint8Array([1, 2, 3]));
  assert.equal(signature.signature.length, 64);
  assert.equal(key.verify(new Uint8Array([1, 2, 3]), signature.signature), true);
});

test("passkey cancellation, timeout and late results never return key material", async (t) => {
  class Credential {
    rawId = new ArrayBuffer(16);
    getClientExtensionResults() { return { prf: { results: { first: new ArrayBuffer(32) } } }; }
  }
  t.mock.method(globalThis, "setTimeout", ((fn: () => void) => {
    return originalTimeout(fn, 30);
  }) as typeof setTimeout);
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const credentialDescriptor = Object.getOwnPropertyDescriptor(globalThis, "PublicKeyCredential");
  const credentialsDescriptor = Object.getOwnPropertyDescriptor(navigator, "credentials");
  let calls = 0;
  let finish: ((value: Credential) => void) | undefined;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { PublicKeyCredential: Credential, location: { hostname: "localhost" } } });
  Object.defineProperty(globalThis, "PublicKeyCredential", { configurable: true, value: Credential });
  Object.defineProperty(navigator, "credentials", { configurable: true, value: {
    get: () => { calls++; return new Promise<Credential>((resolve) => { finish = resolve; }); },
    create: () => { throw new Error("must not create after cancellation"); },
  } });
  try {
    const controller = new AbortController();
    controller.abort();
    assert.deepEqual(await unlockDevice(controller.signal), { error: "The passkey was cancelled." });
    assert.equal(calls, 0);

    const pending = unlockDevice();
    assert.deepEqual(await pending, { error: "The passkey request timed out. Try again when your device is ready." });
    assert.equal(calls, 1);
    finish?.(new Credential());
    await new Promise((resolve) => originalTimeout(resolve, 5));
    assert.equal(calls, 1);

    const credentials = navigator.credentials;
    let created = 0;
    Object.assign(credentials, {
      create: async (options: CredentialCreationOptions) => {
        created++;
        assert.equal(options.publicKey?.authenticatorSelection?.userVerification, "required");
        assert.match(options.publicKey!.user.name, /^bouncer-[0-9a-f]{8}$/);
        return new Credential();
      },
      get: async () => { throw new Error("Create must not retrieve an existing credential first"); },
    });
    const createdKey = await unlockDevice(undefined, "create");
    assert.ok("ikm" in createdKey);
    assert.equal(createdKey.ikm.length, 32);
    createdKey.ikm.fill(0);
    assert.equal(created, 1);

    Object.assign(credentials, { get: async () => null });
    assert.ok("error" in await unlockDevice());
    assert.equal(created, 1, "unlock must not silently create a replacement");

    // Return a credential instance without PRF, including on the PRF follow-up.
    const noPrf = new Credential();
    Object.assign(noPrf, { getClientExtensionResults: () => ({}) });
    Object.assign(credentials, { create: async () => noPrf, get: async () => noPrf });
    const unsupported = await unlockDevice(undefined, "create");
    assert.ok("error" in unsupported && unsupported.error.includes("PRF"));
  } finally {
    for (const [target, key, descriptor] of [[globalThis, "window", windowDescriptor], [globalThis, "PublicKeyCredential", credentialDescriptor], [navigator, "credentials", credentialsDescriptor]] as const) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  }
});

const originalTimeout = globalThis.setTimeout;
