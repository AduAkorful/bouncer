import { Account, actions, KeyPair, PublicKey, type KeyPairString } from "near-api-js";
import { claimMessage } from "./claim";
import { deriveSecrets, unlockDevice } from "./device-pass";
import { accessMessage, accessOnAccount, testnetAccountId } from "./imported-account";

const CLAIM_GAS = 300_000_000_000_000n;

export async function sendClaim(input: {
  vaultId: string;
  contractId: string;
  round: string;
  raidId: string;
  rpcUrl: string;
  networkId: string;
  accountId?: string | null;
}): Promise<{ ok: true; transactionHash: string; accountId: string } | { ok: false; error: string }> {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  if (!/^[0-9]+$/.test(input.round) || !Number.isSafeInteger(Number(input.round))) return { ok: false, error: "round" };
  const named = input.accountId?.trim() ? testnetAccountId(input.accountId) : null;
  if (input.accountId?.trim() && !named) return { ok: false, error: "That account name cannot be used." };
  const secrets = await deviceSecrets(input.vaultId, input.round);
  if ("error" in secrets) return { ok: false, error: secrets.error };
  if (secrets.raidId !== input.raidId) return { ok: false, error: "This phone's passkey does not match this raid." };
  try {
    const accountId = named ?? (await relayAccount(secrets.accountPublicKey));
    if (!accountId) return { ok: false, error: "The passkey account was not created." };
    if (named) {
      const check = await accessOnAccount(input.rpcUrl, named, secrets.accountPublicKey);
      if (check !== "full") return { ok: false, error: accessMessage(check) };
    }
    const signature = KeyPair.fromString(secrets.claimSecret).sign(claimMessage(input.vaultId, BigInt(input.round), input.raidId, accountId));
    const player = new Account(accountId, input.rpcUrl, secrets.accountSecret);
    const outcome = await player.signAndSendTransaction({
      receiverId: input.contractId,
      waitUntil: "FINAL",
      actions: [
        actions.functionCall(
          "claim",
          {
            vault_id: input.vaultId,
            round: Number(input.round),
            raid_id: input.raidId,
            payout: accountId,
            claim_sig: [...signature.signature],
          },
          CLAIM_GAS,
          0n,
        ),
      ],
    });
    const hash = outcome.transaction?.hash;
    if (!hash) return { ok: false, error: "The claim was not sent." };
    if (outcome.status && typeof outcome.status === "object" && "Failure" in outcome.status) {
      return { ok: false, error: "The vault refused the claim." };
    }
    return { ok: true, transactionHash: hash, accountId };
  } catch (error) {
    return { ok: false, error: shortError(error) };
  }
}

async function relayAccount(publicKey: string): Promise<string | null> {
  const created = await fetch("/api/passkey/create-account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicKey }),
  });
  const account = (await created.json().catch(() => null)) as { ok?: boolean; accountId?: string } | null;
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
  if (secrets.raidId !== input.raidId) return { ok: false, error: "This phone's passkey does not match this raid." };
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
  const unlocked = await unlockDevice();
  if ("error" in unlocked) return unlocked;
  const secrets = await deriveSecrets(unlocked.ikm, vaultId, round);
  unlocked.ikm.fill(0);
  if ("error" in secrets) return { error: "This phone cannot keep a key in the passkey." };
  return secrets;
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : "The claim was not sent.";
  if (message.length > 180 || message.includes("ed25519:")) return "The claim was not sent.";
  return message;
}
