import { Account, actions, KeyPair, KeyPairSigner, PublicKey, type KeyPairString } from "near-api-js";
import { apiPost, apiPostOnce } from "./api";
import { claimMessage } from "./claim";
import { CLAIM_GAS, CLAIM_TTL_BLOCKS, claimDelegate } from "./claim-relay";
import { deriveSecrets } from "./device-pass";
import { unlockHeld } from "./player-hold";
import { accessMessage, accessOnAccount, testnetAccountId } from "./imported-account";
import { reasonOf } from "./vault-errors";

const SPONSOR_ACCOUNT = "This passkey's account sponsors this door, and a door's sponsor cannot be paid from it. Nothing was sent.";

export async function sendClaim(input: {
  vaultId: string;
  contractId: string;
  round: string;
  raidId: string;
  rpcUrl: string;
  networkId: string;
  accountId?: string | null;
  /** Accounts the vault will not pay, such as the door's sponsor. Checked before anything is sent. */
  refuse?: string[];
}): Promise<{ ok: true; transactionHash: string; accountId: string } | { ok: false; error: string }> {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  if (!/^[0-9]+$/.test(input.round) || !Number.isSafeInteger(Number(input.round))) return { ok: false, error: "round" };
  const named = input.accountId?.trim() ? testnetAccountId(input.accountId) : null;
  if (input.accountId?.trim() && !named) return { ok: false, error: "That account name cannot be used." };
  const secrets = await deviceSecrets(input.vaultId, input.round);
  if ("error" in secrets) return { ok: false, error: secrets.error };
  if (secrets.raidId !== input.raidId) return { ok: false, error: "This device's passkey does not match this raid." };
  try {
    if (named && input.refuse?.includes(named)) return { ok: false, error: SPONSOR_ACCOUNT };
    // The passkey's own account is the same one it sponsors with, so check it before making or using it.
    const accountId = named ?? (await relayAccount(input.rpcUrl, secrets.accountPublicKey));
    if (!accountId) return { ok: false, error: "The passkey account was not created." };
    if (input.refuse?.includes(accountId)) return { ok: false, error: SPONSOR_ACCOUNT };
    if (named) {
      const check = await accessOnAccount(input.rpcUrl, named, secrets.accountPublicKey);
      if (check !== "full") return { ok: false, error: accessMessage(check) };
    }
    const signature = KeyPair.fromString(secrets.claimSecret).sign(claimMessage(input.vaultId, BigInt(input.round), input.raidId, accountId));
    const args = {
      vault_id: input.vaultId,
      round: Number(input.round),
      raid_id: input.raidId,
      payout: accountId,
      claim_sig: [...signature.signature],
    };
    // The player signs; the relay sends it and pays the gas, so a new account never has to hold NEAR for it.
    const player = new Account(accountId, input.rpcUrl, secrets.accountSecret);
    const signer = KeyPairSigner.fromSecretKey(secrets.accountSecret);
    const publicKey = await signer.getPublicKey();
    const draft = await player.createMetaTransaction({
      receiverId: input.contractId,
      actions: [actions.functionCall("claim", args, CLAIM_GAS, 0n)],
      blockHeightTtl: CLAIM_TTL_BLOCKS,
      publicKey,
    });
    const delegate = claimDelegate({ senderId: accountId, receiverId: input.contractId, publicKey, nonce: draft.nonce, maxBlockHeight: draft.maxBlockHeight, args });
    const { signedDelegate } = await signer.signDelegateAction(delegate);
    const data = signedDelegate.signature.ed25519Signature?.data;
    if (!data) return { ok: false, error: "The claim was not sent." };
    const sent = await apiPostOnce("/passkey/claim", {
      senderId: accountId,
      publicKey: publicKey.toString(),
      nonce: draft.nonce.toString(),
      maxBlockHeight: draft.maxBlockHeight.toString(),
      args,
      signature: btoa(String.fromCharCode(...data)),
    });
    if (!sent.ok) return { ok: false, error: "The claim could not be sent. Nothing was paid. Try again in a minute." };
    const reply = sent.body as { ok?: boolean; hash?: string; reason?: string } | null;
    if (sent.status === 422) return { ok: false, error: typeof reply?.reason === "string" ? reply.reason : reasonOf(null) };
    if (!reply?.ok || typeof reply.hash !== "string") return { ok: false, error: "The claim could not be sent. Nothing was paid. Try again in a minute." };
    const hash = reply.hash;
    return { ok: true, transactionHash: hash, accountId };
  } catch (error) {
    return { ok: false, error: shortError(error) };
  }
}

async function relayAccount(rpcUrl: string, publicKey: string): Promise<string | null> {
  // An account this passkey already has is used as it is; only a new passkey makes one.
  const looked = await apiPost("/passkey/account", { publicKey });
  const known = (looked.ok && looked.status === 200 ? looked.body : null) as { ok?: boolean; accountId?: string } | null;
  if (known?.ok && typeof known.accountId === "string" && (await accessOnAccount(rpcUrl, known.accountId, publicKey)) === "full") return known.accountId;
  const created = await apiPostOnce("/passkey/create-account", { publicKey });
  const account = (created.ok ? created.body : null) as { ok?: boolean; accountId?: string } | null;
  if (!account?.ok || typeof account.accountId !== "string") return null;
  return account.accountId;
}

/** Adds a wallet's public key. The passkey key is not shown and is not replaced. */
export async function addWalletKey(input: {
  vaultId: string;
  round: string;
  raidId: string;
  rpcUrl: string;
  networkId: string;
  accountId: string;
  walletPublicKey: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  let walletKey: PublicKey;
  try {
    walletKey = PublicKey.from(input.walletPublicKey.trim());
  } catch {
    return { ok: false, error: "That public key could not be read." };
  }
  const secrets = await deviceSecrets(input.vaultId, input.round);
  if ("error" in secrets) return { ok: false, error: secrets.error };
  if (secrets.raidId !== input.raidId) return { ok: false, error: "This device's passkey does not match this raid." };
  try {
    const player = new Account(input.accountId, input.rpcUrl, secrets.accountSecret);
    const outcome = await player.signAndSendTransaction({
      receiverId: input.accountId,
      waitUntil: "FINAL",
      actions: [actions.addFullAccessKey(walletKey)],
    });
    if (!outcome.transaction?.hash) return { ok: false, error: "That key was not added." };
    if (outcome.status && typeof outcome.status === "object" && "Failure" in outcome.status) {
      return { ok: false, error: "That key was not added." };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: shortError(error) };
  }
}

async function deviceSecrets(
  vaultId: string,
  round: string,
): Promise<
  | { accountSecret: KeyPairString; accountPublicKey: string; claimSecret: KeyPairString; raidId: string }
  | { error: string }
> {
  const unlocked = await unlockHeld();
  if ("error" in unlocked) return unlocked;
  const secrets = await deriveSecrets(unlocked.ikm, vaultId, round);
  unlocked.ikm.fill(0);
  if ("error" in secrets) return { error: "This device cannot keep a key in the passkey." };
  return secrets;
}

/** A node error carries account ids and raw yocto amounts. None of it reaches the screen. */
function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("sponsor cannot claim")) return reasonOf(message);
  return "The claim was not sent. Nothing was paid. Try again in a minute.";
}
