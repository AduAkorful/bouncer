import { parseOwner, parseRpcJson, parseVault, viewRequest, type VaultView } from "./vault.ts";

export type Rpc = (request: ReturnType<typeof viewRequest>) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
type RpcOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  /** A second endpoint for the last try, when the first keeps refusing. */
  fallbackUrl?: string | null;
  /** Waits before the second and third tries. */
  retryDelaysMs?: readonly number[];
  /** Where a failed read is reported. The reason never reaches the page. */
  log?: (line: string) => void;
};

/** One chain call, including its body. A page read is two of these rounds. */
export const CALL_BUDGET_MS = 10_000;
export const PAGE_READ_MS = CALL_BUDGET_MS * 2;
const RETRY_DELAYS_MS = [300, 900] as const;

type RpcResult = { ok: true; value: unknown } | { ok: false; error: string };
type Attempt = RpcResult | { ok: false; error: "rpc"; reason: string; retry: boolean };

/** These answers will be the same on a second try. Anything else may be a busy or rate-limited node. */
const SETTLED_CAUSES = new Set(["UNKNOWN_ACCOUNT", "NO_CONTRACT_CODE", "CONTRACT_EXECUTION_ERROR", "PARSE_ERROR", "UNKNOWN_ACCESS_KEY"]);

const flights = new Map<string, Promise<RpcResult>>();

async function once(rpcUrl: string, fetchImpl: typeof fetch, options: RpcOptions, request: ReturnType<typeof viewRequest>): Promise<Attempt> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, options.timeoutMs ?? CALL_BUDGET_MS);
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new DOMException("RPC read aborted", "AbortError"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    controller.signal.throwIfAborted();
    return await Promise.race([aborted, (async (): Promise<Attempt> => {
      const response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        cache: "no-store",
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      if (!response.ok) return { ok: false, error: "rpc", reason: `http ${response.status}`, retry: response.status === 429 || response.status >= 500 };
      const body = await response.json();
      controller.signal.throwIfAborted();
      const cause = rpcCause(body);
      if (cause) return { ok: false, error: "rpc", reason: `rpc ${cause}`, retry: !SETTLED_CAUSES.has(cause) };
      const parsed = parseRpcJson(body);
      return parsed.ok ? parsed : { ok: false, error: "rpc", reason: "body", retry: false };
    })()]);
  } catch (error) {
    const reason = controller.signal.aborted ? "timeout" : error instanceof SyntaxError ? "body" : "network";
    return { ok: false, error: "rpc", reason, retry: reason !== "body" };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

function rpcCause(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;
  if (!error) return null;
  if (typeof error !== "object") return "error";
  const record = error as { cause?: { name?: unknown }; name?: unknown };
  const name = record.cause?.name ?? record.name;
  return typeof name === "string" && /^[A-Z_]{1,64}$/.test(name) ? name : "error";
}

/**
 * Up to three tries with short waits, the last one on the fallback endpoint when there is one.
 * QA saw door reads fail fast under load, which reads as the node refusing, not as a slow answer.
 */
async function readWithRetry(rpcUrl: string, fetchImpl: typeof fetch, options: RpcOptions, request: ReturnType<typeof viewRequest>): Promise<RpcResult> {
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;
  const reasons: string[] = [];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) {
      if (options.signal?.aborted) break;
      await wait(delays[attempt - 1], options.signal);
      if (options.signal?.aborted) break;
    }
    const last = attempt === delays.length;
    const url = last && options.fallbackUrl ? options.fallbackUrl : rpcUrl;
    const result = await once(url, fetchImpl, options, request);
    if (result.ok) return result;
    const failed = result as { reason?: string; retry?: boolean };
    reasons.push(`${hostOf(url)} ${failed.reason ?? "rpc"}`);
    if (!failed.retry) break;
  }
  const method = (request.params as { method_name?: unknown }).method_name;
  (options.log ?? defaultLog)(`rpc read failed: ${typeof method === "string" ? method : "view"} · ${reasons.join(", ")}`);
  return { ok: false, error: "rpc" };
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "rpc";
  }
}

function defaultLog(line: string) {
  console.warn(line);
}

export function httpRpc(rpcUrl: string, fetchImpl: typeof fetch = fetch, options: RpcOptions = {}): Rpc {
  return (request) => {
    const key = `${rpcUrl}\n${JSON.stringify(request)}`;
    const current = flights.get(key);
    if (current) return current;
    const run = readWithRetry(rpcUrl, fetchImpl, options, request).finally(() => {
      if (flights.get(key) === run) flights.delete(key);
    });
    flights.set(key, run);
    return run;
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
