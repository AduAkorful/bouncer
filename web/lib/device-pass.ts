import { baseEncode, KeyPairEd25519, type KeyPairString } from "near-api-js";

const PRF_LABEL = "bouncer.prf.v1";
const HKDF_SALT = "bouncer.hkdf.v1";

export type DeviceSecrets = {
  accountSecret: KeyPairString;
  accountPublicKey: string;
  claimPublicKeyHex: string;
  claimSecret: KeyPairString;
  raidId: string;
};

type Unlocked = { ikm: Uint8Array } | { error: string };

export async function deriveSecrets(ikm: Uint8Array, vaultId: string, round: string): Promise<DeviceSecrets | { error: string }> {
  if (ikm.length !== 32 || !vaultId || !/^[0-9]+$/.test(round)) return { error: "passkey" };
  try {
    const salt = await digest(HKDF_SALT);
    const accountSeed = await hkdf(ikm, salt, "bouncer.account.v1", 32);
    const claimSeed = await hkdf(ikm, salt, "bouncer.claim.v1", 32);
    const raidBytes = await hkdf(ikm, salt, `bouncer.raid.v1\n${vaultId}\n${round}`, 16);
    const account = keyFromSeed(accountSeed);
    const claim = keyFromSeed(claimSeed);
    return {
      accountSecret: account.toString() as KeyPairString,
      accountPublicKey: account.publicKey.toString(),
      claimSecret: claim.toString() as KeyPairString,
      claimPublicKeyHex: [...claim.publicKey.data].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      raidId: [...raidBytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
    };
  } catch {
    return { error: "passkey" };
  }
}

const ED25519_PKCS8 = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);

export function keyFromSeed(seed: Uint8Array): KeyPairEd25519 {
  return new KeyPairEd25519(baseEncode(seed));
}

export async function importClaimKey(seed: Uint8Array): Promise<CryptoKey> {
  const pkcs8 = new Uint8Array(ED25519_PKCS8.length + seed.length);
  pkcs8.set(ED25519_PKCS8);
  pkcs8.set(seed, ED25519_PKCS8.length);
  return crypto.subtle.importKey("pkcs8", owned(pkcs8), { name: "Ed25519" }, false, ["sign"]);
}

/** Asks this device for its passkey. The same passkey returns the same bytes. */
export async function unlockDevice(signal?: AbortSignal, mode: "get" | "create" = "get"): Promise<Unlocked> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials) {
    return { error: "This device cannot keep a key in the passkey." };
  }
  const host = window.location.hostname;
  if (!host) return { error: "This device cannot keep a key in the passkey." };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 60_000);
  const active = controller.signal;
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new DOMException("Passkey cancelled", "AbortError"));
    active.addEventListener("abort", onAbort, { once: true });
  });
  try {
    active.throwIfAborted();
    return await Promise.race([aborted, (async (): Promise<Unlocked> => {
      const salt = await digest(PRF_LABEL);
      active.throwIfAborted();
      const credential = mode === "create" ? await createPasskey(host, salt, active) : await getPasskey(host, salt, active, null);
      active.throwIfAborted();
      if (!credential) return { error: "No passkey was selected. Create one from the passkey page, or try again with your existing passkey." };
      const ikm = prfBytes(credential) ?? (mode === "create" ? null : prfBytes(await getPasskey(host, salt, active, rawId(credential))));
      if (active.aborted) { ikm?.fill(0); active.throwIfAborted(); }
      if (!ikm || ikm.length !== 32) return { error: "This passkey cannot unlock Bouncer. Try a passkey provider that supports secure key derivation (PRF)." };
      return { ikm };
    })()]);
  } catch (error) {
    if (active.aborted) return { error: timedOut ? "The passkey request timed out. Try again when your device is ready." : "The passkey was cancelled." };
    if (error instanceof DOMException && error.name === "NotAllowedError") return { error: "The passkey was dismissed." };
    return { error: "This device cannot keep a key in the passkey." };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    active.removeEventListener("abort", onAbort);
  }
}

function owned(value: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new ArrayBuffer(value.byteLength);
  const bytes = new Uint8Array(copy);
  bytes.set(value);
  return bytes;
}

async function digest(label: string): Promise<Uint8Array<ArrayBuffer>> {
  return owned(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(label))));
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: string, length: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", owned(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: owned(salt), info: new TextEncoder().encode(info) },
    key,
    length * 8,
  );
  return owned(new Uint8Array(bits));
}

function prfExtension(salt: Uint8Array) {
  return { prf: { eval: { first: salt } } };
}

async function getPasskey(host: string, salt: Uint8Array, signal: AbortSignal, id: BufferSource | null): Promise<PublicKeyCredential | null> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  // The PRF extension on a discoverable request is what makes Windows show
  // "Insert your security key." The picker stays a plain passkey request.
  // PRF is asked only for the passkey the user just chose, with no transport.
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: host,
    timeout: 60_000,
    userVerification: id ? "preferred" : "required",
  };
  if (id) {
    publicKey.allowCredentials = [{ type: "public-key", id }];
    publicKey.extensions = prfExtension(salt) as AuthenticationExtensionsClientInputs;
  }
  const credential = await navigator.credentials.get({ signal, publicKey });
  return credential instanceof PublicKeyCredential ? credential : null;
}

function rawId(credential: PublicKeyCredential): BufferSource {
  const bytes = new Uint8Array(credential.rawId);
  return owned(bytes);
}

async function createPasskey(host: string, salt: Uint8Array, signal: AbortSignal): Promise<PublicKeyCredential> {
  const challenge = new Uint8Array(32);
  const user = new Uint8Array(16);
  crypto.getRandomValues(challenge);
  crypto.getRandomValues(user);
  const credential = await navigator.credentials.create({
    signal,
    publicKey: {
      rp: { name: "Bouncer", id: host },
      user: { id: user, name: `bouncer-${[...user.slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("")}`, displayName: "Bouncer player" },
      challenge,
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      timeout: 60_000,
      extensions: prfExtension(salt) as AuthenticationExtensionsClientInputs,
    },
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("passkey");
  return credential;
}

function prfBytes(credential: PublicKeyCredential | null): Uint8Array | null {
  if (!credential) return null;
  const results = credential.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } };
  const first = results.prf?.results?.first;
  if (!first || first.byteLength !== 32) return null;
  return new Uint8Array(first);
}
