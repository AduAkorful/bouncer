import { createHash } from "node:crypto";
import { Account, actions, encodeDelegateAction, type KeyPairString, PublicKey, Signature } from "near-api-js";
import { claimDelegate, readClaimBody } from "../../web/lib/claim-relay.ts";
import { reasonOf } from "../../web/lib/vault-errors.ts";
import type { RelayEnv } from "../../web/lib/config.ts";

export type ClaimRelay = (body: unknown) => Promise<{ ok: true; hash: string } | { ok: false; error: string; reason?: string }>;

/**
 * Sends a claim the player signed, and pays for it. The player's account never needs NEAR for gas.
 * The delegate action is built again here from fields, so nothing but a `claim` on the vault, with no deposit,
 * can be relayed, and the signature has to be the player's key over exactly that.
 */
export function createClaimRelay(env: RelayEnv): ClaimRelay {
  return async (raw) => {
    const body = readClaimBody(raw);
    if (!body) return { ok: false, error: "claim" };
    let publicKey: PublicKey;
    try {
      publicKey = PublicKey.from(body.publicKey);
    } catch {
      return { ok: false, error: "claim" };
    }
    const delegate = claimDelegate({
      senderId: body.senderId,
      receiverId: env.contractId,
      publicKey,
      nonce: BigInt(body.nonce),
      maxBlockHeight: BigInt(body.maxBlockHeight),
      args: body.args,
    });
    const data = Uint8Array.from(Buffer.from(body.signature, "base64"));
    const digest = createHash("sha256").update(encodeDelegateAction(delegate)).digest();
    if (!publicKey.verify(digest, data)) return { ok: false, error: "claim" };
    try {
      const relay = new Account(env.accountId, env.rpcUrl, env.privateKey as KeyPairString);
      const signature = new Signature({ keyType: publicKey.keyType, data });
      const outcome = await relay.signAndSendTransaction({
        receiverId: body.senderId,
        waitUntil: "FINAL",
        actions: [actions.signedDelegate({ delegateAction: delegate, signature })],
      });
      const hash = outcome.transaction?.hash as string | undefined;
      if (!hash) return { ok: false, error: "claim" };
      const status = outcome.status as unknown;
      if (status && typeof status === "object" && "Failure" in status) return { ok: false, error: "refused", reason: reasonOf(status) };
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "claim" };
    }
  };
}
