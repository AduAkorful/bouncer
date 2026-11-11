/** Required configuration. A missing or empty value is not replaced. */

export type GuardEnv = {
  callUrl: string;
  paymentKey: string;
  versionKey: string;
  maxExecutionSeconds: number;
  maxMemoryMb: number;
};

export type RelayEnv = {
  rpcUrl: string;
  networkId: string;
  contractId: string;
  vaultId: string;
  accountId: string;
  /** Full access. Only for creating passkey accounts and relaying the claims players sign. */
  privateKey: string;
  /** A function-call key on the relay account that can call only `submit_verdict` on the vault (plan 73). */
  verdictKey: string;
};

export type PublicEnv = {
  rpcUrl: string;
  /** Optional. A second RPC endpoint for the last try of a read. */
  rpcFallbackUrl: string | null;
  /** Optional. A node that keeps old blocks, so a win older than a few days can still be checked. */
  archivalRpcUrl: string | null;
  /** Optional. OutLayer's API, which the claim page reads a call's attestation from directly. */
  outlayerApiUrl: string | null;
  /** Optional. The guard wasm SHA-256 this build pins. The Verified panel compares OutLayer's record with it. */
  guardVersion: string | null;
  contractId: string;
  currency: string;
  decimals: number;
  networkTag: string;
  networkId: string;
  storageName: string;
  messageBudget: number;
  venue: string;
};

export type Missing = { ok: false; missing: string[] };
export type Ready<T> = { ok: true; env: T };

const GUARD_KEYS = [
  "OUTLAYER_CALL_URL",
  "OUTLAYER_PAYMENT_KEY",
  "OUTLAYER_VERSION_KEY",
  "OUTLAYER_MAX_EXECUTION_SECONDS",
  "OUTLAYER_MAX_MEMORY_MB",
] as const;

const RELAY_KEYS = [
  "NEAR_RPC_URL",
  "NEAR_NETWORK_ID",
  "VAULT_CONTRACT_ID",
  "VAULT_ID",
  "RELAY_ACCOUNT_ID",
  "RELAY_PRIVATE_KEY",
  "RELAY_VERDICT_KEY",
] as const;

const PUBLIC_KEYS = [
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_VAULT_CONTRACT_ID",
  "NEXT_PUBLIC_CURRENCY",
  "NEXT_PUBLIC_CURRENCY_DECIMALS",
  "NEXT_PUBLIC_NETWORK_TAG",
  "NEXT_PUBLIC_NETWORK_ID",
  "NEXT_PUBLIC_STORAGE_NAME",
  "NEXT_PUBLIC_MESSAGE_BUDGET",
  "NEXT_PUBLIC_VENUE",
] as const;


export function readGuardEnv(source: EnvSource | undefined): Ready<GuardEnv> | Missing {
  const read = reader(source);
  const missing = absent(read, GUARD_KEYS);
  if (missing.length) return { ok: false, missing };
  const maxExecutionSeconds = whole(read("OUTLAYER_MAX_EXECUTION_SECONDS"));
  const maxMemoryMb = whole(read("OUTLAYER_MAX_MEMORY_MB"));
  const versionKey = read("OUTLAYER_VERSION_KEY");
  if (maxExecutionSeconds === null) missing.push("OUTLAYER_MAX_EXECUTION_SECONDS");
  if (maxMemoryMb === null) missing.push("OUTLAYER_MAX_MEMORY_MB");
  if (!/^[0-9a-f]{64}$/.test(versionKey)) missing.push("OUTLAYER_VERSION_KEY");
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    env: {
      callUrl: read("OUTLAYER_CALL_URL"),
      paymentKey: read("OUTLAYER_PAYMENT_KEY"),
      versionKey,
      maxExecutionSeconds: maxExecutionSeconds as number,
      maxMemoryMb: maxMemoryMb as number,
    },
  };
}

export function readRelayEnv(source: EnvSource | undefined): Ready<RelayEnv> | Missing {
  const read = reader(source);
  const missing = absent(read, RELAY_KEYS);
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    env: {
      rpcUrl: read("NEAR_RPC_URL"),
      networkId: read("NEAR_NETWORK_ID"),
      contractId: read("VAULT_CONTRACT_ID"),
      vaultId: read("VAULT_ID"),
      accountId: read("RELAY_ACCOUNT_ID"),
      privateKey: read("RELAY_PRIVATE_KEY"),
      verdictKey: read("RELAY_VERDICT_KEY"),
    },
  };
}

export function readPublicEnv(source: EnvSource | undefined): Ready<PublicEnv> | Missing {
  const read = reader(source);
  const missing = absent(read, PUBLIC_KEYS);
  const decimals = whole(read("NEXT_PUBLIC_CURRENCY_DECIMALS"));
  const messageBudget = whole(read("NEXT_PUBLIC_MESSAGE_BUDGET"));
  if (!missing.includes("NEXT_PUBLIC_CURRENCY_DECIMALS") && decimals === null) missing.push("NEXT_PUBLIC_CURRENCY_DECIMALS");
  if (!missing.includes("NEXT_PUBLIC_MESSAGE_BUDGET") && messageBudget === null) missing.push("NEXT_PUBLIC_MESSAGE_BUDGET");
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    env: {
      rpcUrl: read("NEXT_PUBLIC_RPC_URL"),
      rpcFallbackUrl: httpsUrl(read("NEXT_PUBLIC_RPC_FALLBACK_URL")),
      archivalRpcUrl: httpsUrl(read("NEXT_PUBLIC_ARCHIVAL_RPC_URL")),
      outlayerApiUrl: httpsUrl(read("NEXT_PUBLIC_OUTLAYER_API_URL")),
      guardVersion: /^[0-9a-f]{64}$/.test(read("NEXT_PUBLIC_GUARD_VERSION")) ? read("NEXT_PUBLIC_GUARD_VERSION") : null,
      contractId: read("NEXT_PUBLIC_VAULT_CONTRACT_ID"),
      currency: read("NEXT_PUBLIC_CURRENCY"),
      decimals: decimals as number,
      networkTag: read("NEXT_PUBLIC_NETWORK_TAG"),
      networkId: read("NEXT_PUBLIC_NETWORK_ID"),
      storageName: read("NEXT_PUBLIC_STORAGE_NAME"),
      messageBudget: messageBudget as number,
      venue: read("NEXT_PUBLIC_VENUE"),
    },
  };
}

type EnvSource = Record<string, string | undefined>;

function reader(source: EnvSource | undefined) {
  const env = source ?? {};
  return (key: string) => env[key]?.trim() ?? "";
}

function absent(read: (key: string) => string, keys: readonly string[]): string[] {
  return keys.filter((key) => read(key) === "");
}

function whole(value: string): number | null {
  if (!/^[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
}

function httpsUrl(value: string): string | null {
  return /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(value) ? value : null;
}
