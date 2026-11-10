import { cacheLife } from "next/cache";
import { httpRpc, PAGE_READ_MS, type Rpc } from "./chain.ts";

/**
 * Chain reads for server-rendered pages. Many visitors loading at once used to send the same
 * `list_vaults` and `get_vault` calls to the node together, and it refused them all (QA R21 R-01).
 *
 * - A shared cache holds each answer for five seconds, so a burst of page loads asks the node once.
 * - This process remembers the last good answer. A refused read shows that answer for up to ten minutes
 *   instead of an unread door. The pot shown can be that old; raids, bills, and claims read the chain
 *   when they act, so a page never pays from it.
 * - A failed read is not cached, so the next load asks again.
 */

const FRESH_MS = 4_000;
const STALE_MS = 10 * 60_000;
const MAX_REMEMBERED = 500;

type Result = { ok: true; value: unknown } | { ok: false; error: string };

const lastGood = new Map<string, { at: number; value: unknown }>();

export function pageRpc(labels: { rpcUrl: string; rpcFallbackUrl: string | null }, now: () => number = Date.now): Rpc {
  // One answer per request, so the door list and the door share a read.
  const kept = new Map<string, Promise<Result>>();
  return (request) => {
    const body = JSON.stringify(request);
    const key = `${labels.rpcUrl}\n${body}`;
    const known = kept.get(key);
    if (known) return known;
    const run = read(key, body, labels, now);
    kept.set(key, run);
    return run;
  };
}

async function read(key: string, body: string, labels: { rpcUrl: string; rpcFallbackUrl: string | null }, now: () => number): Promise<Result> {
  const memo = lastGood.get(key);
  if (memo && now() - memo.at < FRESH_MS) return { ok: true, value: memo.value };
  try {
    const value = await withBudget(sharedView(labels.rpcUrl, labels.rpcFallbackUrl, body));
    remember(key, value, now());
    return { ok: true, value };
  } catch {
    if (memo && now() - memo.at < STALE_MS) return { ok: true, value: memo.value };
    return { ok: false, error: "rpc" };
  }
}

function remember(key: string, value: unknown, at: number) {
  lastGood.delete(key);
  lastGood.set(key, { at, value });
  if (lastGood.size > MAX_REMEMBERED) {
    const oldest = lastGood.keys().next().value;
    if (oldest !== undefined) lastGood.delete(oldest);
  }
}

function withBudget<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("page read budget")), PAGE_READ_MS);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/** Shared by every server instance. A throw leaves nothing cached. */
async function sharedView(rpcUrl: string, fallbackUrl: string | null, body: string): Promise<unknown> {
  "use cache: remote";
  cacheLife({ stale: 5, revalidate: 5, expire: 120 });
  const result = await httpRpc(rpcUrl, fetch, { fallbackUrl })(JSON.parse(body));
  if (!result.ok) throw new Error("rpc read failed");
  return result.value;
}
