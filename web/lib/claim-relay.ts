import { actions, buildDelegateAction, type DelegateAction, type PublicKey } from "near-api-js";

/** The vault refuses a claim that carries less than this, so the relay attaches it and pays for it. */
export const CLAIM_GAS = 300_000_000_000_000n;
/** How long a signed claim stays valid, in blocks. */
export const CLAIM_TTL_BLOCKS = 200;

export type ClaimArgs = {
  vault_id: string;
  round: number;
  raid_id: string;
  payout: string;
  claim_sig: number[];
};

export type ClaimRelayBody = {
  senderId: string;
  publicKey: string;
  nonce: string;
  maxBlockHeight: string;
  args: ClaimArgs;
  /** Base64 of the 64-byte ed25519 signature over the delegate action. */
  signature: string;
};

/** The only action a relayed claim may carry. The server builds it again from the fields, never from bytes. */
export function claimDelegate(input: {
  senderId: string;
  receiverId: string;
  publicKey: PublicKey;
  nonce: bigint;
  maxBlockHeight: bigint;
  args: ClaimArgs;
}): DelegateAction {
  return buildDelegateAction({
    senderId: input.senderId,
    receiverId: input.receiverId,
    actions: [actions.functionCall("claim", input.args, CLAIM_GAS, 0n)],
    nonce: input.nonce,
    maxBlockHeight: input.maxBlockHeight,
    publicKey: input.publicKey,
  });
}

const ACCOUNT = /^[a-z0-9._-]{2,64}$/;

/** Shape check for a relay request. Anything that does not fit is refused before the relay spends anything. */
export function readClaimBody(raw: unknown): ClaimRelayBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const args = b.args as Record<string, unknown> | undefined;
  if (typeof b.senderId !== "string" || !ACCOUNT.test(b.senderId)) return null;
  if (typeof b.publicKey !== "string" || !b.publicKey.startsWith("ed25519:") || b.publicKey.length > 80) return null;
  if (typeof b.nonce !== "string" || !/^[0-9]{1,20}$/.test(b.nonce)) return null;
  if (typeof b.maxBlockHeight !== "string" || !/^[0-9]{1,20}$/.test(b.maxBlockHeight)) return null;
  if (typeof b.signature !== "string" || !/^[A-Za-z0-9+/]{86}==$/.test(b.signature)) return null;
  if (!args || typeof args.vault_id !== "string" || args.vault_id.length > 64) return null;
  if (typeof args.raid_id !== "string" || args.raid_id.length > 128) return null;
  if (typeof args.round !== "number" || !Number.isSafeInteger(args.round) || args.round < 0) return null;
  if (typeof args.payout !== "string" || !ACCOUNT.test(args.payout) || args.payout !== b.senderId) return null;
  const sig = args.claim_sig;
  if (!Array.isArray(sig) || sig.length !== 64 || sig.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return b as unknown as ClaimRelayBody;
}
