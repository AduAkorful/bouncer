import { PublicKey } from "near-api-js";

const NAMED = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export type KeyCheck = "full" | "limited" | "missing" | "absent" | "unread";

type Store = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

/** A testnet account id. A mainnet name is refused. */
export function testnetAccountId(value: string): string | null {
  const id = value.trim().toLowerCase();
  if (id.length < 2 || id.length > 64) return null;
  if (/^[0-9a-f]{64}$/.test(id)) return id;
  if (!id.endsWith(".testnet") || !NAMED.test(id)) return null;
  return id;
}

export function readPayoutAccount(storage: Store | null, storageName: string): string | null {
  const key = storageKey(storageName);
  if (!key || !storage) return null;
  try {
    return testnetAccountId(storage.getItem(key) ?? "");
  } catch {
    return null;
  }
}

export function writePayoutAccount(storage: Store | null, storageName: string, accountId: string | null): void {
  const key = storageKey(storageName);
  if (!key || !storage) return;
  try {
    if (!accountId) {
      storage.removeItem(key);
      return;
    }
    const parsed = testnetAccountId(accountId);
    if (!parsed) return;
    storage.setItem(key, parsed);
  } catch {
    return;
  }
}

/** The passkey can sign for this account only when its key is full access. */
export async function accessOnAccount(
  rpcUrl: string,
  accountId: string,
  publicKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<KeyCheck> {
  const id = testnetAccountId(accountId);
  if (!rpcUrl || !id || !readableKey(publicKey)) return "unread";
  const account = await nearQuery(fetchImpl, rpcUrl, { request_type: "view_account", account_id: id });
  if (!account) return "unread";
  if (causeName(account) === "UNKNOWN_ACCOUNT") return "absent";
  if (!account.result || account.result.error) return "unread";
  const key = await nearQuery(fetchImpl, rpcUrl, { request_type: "view_access_key", account_id: id, public_key: publicKey });
  if (!key) return "unread";
  if (causeName(key) === "UNKNOWN_ACCOUNT") return "absent";
  const permission = key.result?.permission;
  if (permission === "FullAccess") return "full";
  if (permission) return "limited";
  if (typeof key.result?.error === "string" && key.result.error.includes("does not exist")) return "missing";
  return "unread";
}

export function accessMessage(check: KeyCheck): string {
  if (check === "absent") return "That account is not on testnet.";
  if (check === "missing") return "That key is not on the account yet.";
  if (check === "limited") return "That key cannot spend from this account.";
  return "The account could not be read.";
}

function storageKey(storageName: string): string | null {
  const name = storageName.trim();
  if (!name) return null;
  return `${name}.payout-account`;
}

function readableKey(publicKey: string): boolean {
  try {
    PublicKey.from(publicKey);
    return true;
  } catch {
    return false;
  }
}

type QueryBody = {
  result?: { permission?: unknown; error?: unknown; amount?: unknown };
  error?: { cause?: { name?: string } };
};

async function nearQuery(fetchImpl: typeof fetch, rpcUrl: string, params: Record<string, string>): Promise<QueryBody | null> {
  try {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "account", method: "query", params: { finality: "final", ...params } }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as QueryBody;
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

function causeName(body: QueryBody): string {
  const name = body.error?.cause?.name;
  return typeof name === "string" ? name : "";
}
