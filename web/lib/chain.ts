import { parseOwner, parseRpcJson, parseVault, viewRequest, type VaultView } from "./vault.ts";

export type Rpc = (request: ReturnType<typeof viewRequest>) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;

export function httpRpc(rpcUrl: string, fetchImpl: typeof fetch = fetch): Rpc {
  return async (request) => {
    let response: Response;
    try {
      response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
    } catch {
      return { ok: false, error: "rpc" };
    }
    if (!response.ok) return { ok: false, error: "rpc" };
    try {
      return parseRpcJson(await response.json());
    } catch {
      return { ok: false, error: "rpc" };
    }
  };
}

export async function readDoor(
  rpc: Rpc,
  contractId: string,
  vaultId: string,
): Promise<{ ok: true; vault: VaultView; owner: string } | { ok: false; error: string }> {
  const vaultResult = await rpc(viewRequest(contractId, "get_vault", { vault_id: vaultId }));
  if (!vaultResult.ok) return vaultResult;
  const vault = parseVault(vaultResult.value);
  if (!vault.ok) return vault;
  const ownerResult = await rpc(viewRequest(contractId, "get_owner", {}));
  if (!ownerResult.ok) return ownerResult;
  const owner = parseOwner(ownerResult.value);
  if (!owner.ok) return owner;
  return { ok: true, vault: vault.vault, owner: owner.owner };
}
