import { actions, baseDecode, createTransaction, PublicKey } from "near-api-js";
import { claimMessage } from "./claim";
import { quoteUnsafeIntegers } from "./vault";
import { signClaim } from "./session-store";

const CLAIM_GAS = 300_000_000_000_000n;

export async function sendClaim(input: {
  storageName: string;
  vaultId: string;
  contractId: string;
  round: string;
  raidId: string;
  rpcUrl: string;
  networkId: string;
  authClientId: string;
  authContractId: string;
  mpcContractId: string;
}): Promise<{ ok: true; transactionHash: string; accountId: string } | { ok: false; error: string }> {
  if (input.networkId !== "testnet") return { ok: false, error: "The passkey network is not testnet." };
  if (!/^[0-9]+$/.test(input.round) || !Number.isSafeInteger(Number(input.round))) return { ok: false, error: "round" };
  try {
    const { JavascriptProvider } = await import("@fast-auth-near/javascript-provider");
    const { FastAuthSigner } = await import("@fast-auth-near/react-sdk/dist/core/signers/signer.js");
    const { JsonRpcProvider } = await import("near-api-js");
    const provider = new JavascriptProvider({ network: "testnet", clientId: input.authClientId });
    if (!(await provider.isLoggedIn())) await provider.login();
    if (!(await provider.isLoggedIn())) return { ok: false, error: "The passkey did not sign in." };
    const readRequest = provider.getSignatureRequest.bind(provider);
    provider.getSignatureRequest = (async () => {
      const wrapped = await readRequest();
      if (wrapped && typeof wrapped === "object" && "signatureRequest" in wrapped && wrapped.signatureRequest) {
        return wrapped.signatureRequest;
      }
      return wrapped;
    }) as typeof provider.getSignatureRequest;
    const signer = new FastAuthSigner(
      provider,
      { provider: new JsonRpcProvider({ url: input.rpcUrl }) } as never,
      { fastAuthContractId: input.authContractId, mpcContractId: input.mpcContractId },
      `${window.location.origin}/api/passkey`,
    );
    await signer.init();
    const derived = await signer.getPublicKey();
    const publicKey = PublicKey.from(String(derived));
    const created = await fetch("/api/passkey/create-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicKey: publicKey.toString() }),
    });
    const account = (await created.json().catch(() => null)) as { ok?: boolean; accountId?: string; error?: string } | null;
    if (!account?.ok || typeof account.accountId !== "string") return { ok: false, error: "The passkey account was not created." };
    const signature = await signClaim(input.storageName, input.vaultId, input.round, claimMessage(input.vaultId, BigInt(input.round), input.raidId, account.accountId));
    if ("error" in signature) return { ok: false, error: "claim key" };
    const accessKey = await readAccessKey(input.rpcUrl, account.accountId, publicKey.toString());
    if (!accessKey) return { ok: false, error: "The passkey account has no key yet." };
    const transaction = createTransaction(
      account.accountId,
      publicKey,
      input.contractId,
      accessKey.nonce + 1n,
      [
        actions.functionCall(
          "claim",
          {
            vault_id: input.vaultId,
            round: Number(input.round),
            raid_id: input.raidId,
            payout: account.accountId,
            claim_sig: [...signature],
          },
          CLAIM_GAS,
          0n,
        ),
      ],
      baseDecode(accessKey.blockHash),
    );
    const outcome = await signer.signAndSendTransaction({ transaction } as never);
    const hash = outcome.transaction?.hash;
    if (!hash) return { ok: false, error: "The claim was not sent." };
    if (outcome.status && typeof outcome.status === "object" && "Failure" in outcome.status) {
      return { ok: false, error: "The vault refused the claim." };
    }
    return { ok: true, transactionHash: hash, accountId: account.accountId };
  } catch (error) {
    return { ok: false, error: shortError(error) };
  }
}

async function readAccessKey(rpcUrl: string, accountId: string, publicKey: string): Promise<{ nonce: bigint; blockHash: string } | null> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "key",
      method: "query",
      params: { request_type: "view_access_key", finality: "final", account_id: accountId, public_key: publicKey },
    }),
  });
  const text = await response.text();
  const body = JSON.parse(quoteUnsafeIntegers(text)) as { result?: { nonce?: string | number; block_hash?: string } };
  const nonce = body.result?.nonce;
  const blockHash = body.result?.block_hash;
  if ((typeof nonce !== "string" && typeof nonce !== "number") || typeof blockHash !== "string" || !blockHash) return null;
  return { nonce: BigInt(nonce), blockHash };
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : "The claim was not sent.";
  if (message.length > 180 || message.includes("ed25519:")) return "The claim was not sent.";
  return message;
}
