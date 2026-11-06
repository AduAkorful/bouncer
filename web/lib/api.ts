/** Calls to the server that holds the keys. A missing address is an error, never a guess. */

export type ApiResult = { ok: true; status: number; body: unknown } | { ok: false; error: string };

export function readApiBase(value: string | undefined): string | null {
  const url = value?.trim() ?? "";
  return /^https?:\/\/[^/]+$/.test(url) ? url : null;
}

/**
 * One POST. A network error or a 5xx is tried once more with the same body, because the guard answers
 * a repeat of a call it already ran from its stored reply. A 4xx comes back as it is.
 */
export async function postJson(base: string | null, fetchImpl: typeof fetch, path: string, body: unknown, headers: Record<string, string> = {}): Promise<ApiResult> {
  if (!base) return { ok: false, error: "no server" };
  const attempt = async (): Promise<{ result: ApiResult; retry: boolean }> => {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
    } catch {
      return { result: { ok: false, error: "network" }, retry: true };
    }
    const parsed = await response.json().catch(() => null);
    if (response.status >= 500) return { result: { ok: false, error: "server" }, retry: true };
    return { result: { ok: true, status: response.status, body: parsed }, retry: false };
  };
  const first = await attempt();
  if (!first.retry) return first.result;
  return (await attempt()).result;
}

export function apiPost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<ApiResult> {
  return postJson(readApiBase(process.env.NEXT_PUBLIC_API_URL), fetch, path, body, headers);
}

export async function apiGet(path: string): Promise<ApiResult> {
  const base = readApiBase(process.env.NEXT_PUBLIC_API_URL);
  if (!base) return { ok: false, error: "no server" };
  try {
    const response = await fetch(`${base}${path}`);
    const parsed = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, error: "server" };
    return { ok: true, status: response.status, body: parsed };
  } catch {
    return { ok: false, error: "network" };
  }
}

/** The JSON object a call returned, or a flat failure the screens already know how to word. */
export function asObject(result: ApiResult): Record<string, unknown> {
  if (result.ok && result.body && typeof result.body === "object" && !Array.isArray(result.body)) return result.body as Record<string, unknown>;
  return { ok: false, error: "guard" };
}
