import { parseOwner, parseRpcJson, parseVault, viewRequest, type VaultView } from "./vault.ts";

export type Rpc = (request: ReturnType<typeof viewRequest>) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
type RpcOptions = { timeoutMs?: number; signal?: AbortSignal };

export function httpRpc(rpcUrl: string, fetchImpl: typeof fetch = fetch, options: RpcOptions = {}): Rpc {
  return async (request) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(abort, options.timeoutMs ?? 10_000);
    let onAbort: () => void = () => {};
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(new DOMException("RPC read aborted", "AbortError"));
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    try {
      controller.signal.throwIfAborted();
      return await Promise.race([aborted, (async (): ReturnType<Rpc> => {
        const response = await fetchImpl(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
          cache: "no-store",
          signal: controller.signal,
        });
        controller.signal.throwIfAborted();
        if (!response.ok) return { ok: false, error: "rpc" };
        const body = await response.json();
        controller.signal.throwIfAborted();
        return parseRpcJson(body);
      })()]);
    } catch {
      return { ok: false, error: "rpc" };
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      controller.signal.removeEventListener("abort", onAbort);
    }
  };
}

export async function readDoor(
  rpc: Rpc,
  contractId: string,
  vaultId: string,
): Promise<{ ok: true; vault: VaultView; owner: string } | { ok: false; error: string }> {
  const [vaultResult, ownerResult] = await Promise.all([
    rpc(viewRequest(contractId, "get_vault", { vault_id: vaultId })),
    rpc(viewRequest(contractId, "get_owner", {})),
  ]);
  if (!vaultResult.ok) return vaultResult;
  const vault = parseVault(vaultResult.value);
  if (!vault.ok) return vault;
  if (!ownerResult.ok) return ownerResult;
  const owner = parseOwner(ownerResult.value);
  if (!owner.ok) return owner;
  return { ok: true, vault: vault.vault, owner: owner.owner };
}
