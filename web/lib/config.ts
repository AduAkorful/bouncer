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
  privateKey: string;
};

export type CrewEnv = {
  factoryId: string;
  depositYocto: string;
  gas: string;
};

export type PublicEnv = {
  rpcUrl: string;
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

const CREW_KEYS = ["NEXT_PUBLIC_DAO_FACTORY_ID", "NEXT_PUBLIC_DAO_CREATE_DEPOSIT", "NEXT_PUBLIC_DAO_CREATE_GAS"] as const;

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
    },
  };
}

export function readCrewEnv(source: EnvSource | undefined): Ready<CrewEnv> | Missing {
  const read = reader(source);
  const missing = absent(read, CREW_KEYS);
  const depositYocto = read("NEXT_PUBLIC_DAO_CREATE_DEPOSIT");
  const gas = read("NEXT_PUBLIC_DAO_CREATE_GAS");
  if (!missing.includes("NEXT_PUBLIC_DAO_CREATE_DEPOSIT") && whole(depositYocto) === null) missing.push("NEXT_PUBLIC_DAO_CREATE_DEPOSIT");
  if (!missing.includes("NEXT_PUBLIC_DAO_CREATE_GAS") && whole(gas) === null) missing.push("NEXT_PUBLIC_DAO_CREATE_GAS");
  if (missing.length) return { ok: false, missing };
  return { ok: true, env: { factoryId: read("NEXT_PUBLIC_DAO_FACTORY_ID"), depositYocto, gas } };
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
