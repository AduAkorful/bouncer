import { readGuardEnv, readRelayEnv, type GuardEnv, type RelayEnv } from "../../web/lib/config.ts";

export type KeeperEnv = { accountId: string; privateKey: string };

export type ServerEnv = {
  guard: GuardEnv;
  relay: RelayEnv;
  authContractId: string;
  keeper: KeeperEnv | null;
  siteOrigins: string[];
  dailyCalls: number;
  /** Bills one vault takes in one round, across every player. */
  roundBills: number;
  port: number;
};

type Source = Record<string, string | undefined>;

/** A missing value is a list of names, never a guess. The names are not secrets. */
export function readServerEnv(source: Source): { ok: true; env: ServerEnv } | { ok: false; missing: string[] } {
  const guard = readGuardEnv(source);
  const relay = readRelayEnv(source);
  const missing: string[] = [];
  if (!guard.ok) missing.push(...guard.missing);
  if (!relay.ok) missing.push(...relay.missing);
  const read = (key: string) => source[key]?.trim() ?? "";
  const authContractId = read("AUTH_CONTRACT_ID");
  if (!authContractId) missing.push("AUTH_CONTRACT_ID");
  const origins = read("SITE_ORIGIN").split(",").map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0 || origins.some((o) => !/^https?:\/\/[^/]+$/.test(o))) missing.push("SITE_ORIGIN");
  const dailyCalls = Number(read("SPONSOR_DAILY_CALLS"));
  if (!Number.isSafeInteger(dailyCalls) || dailyCalls < 1) missing.push("SPONSOR_DAILY_CALLS");
  const roundBills = Number(read("VAULT_ROUND_BILLS") || "5000");
  if (!Number.isSafeInteger(roundBills) || roundBills < 1) missing.push("VAULT_ROUND_BILLS");
  const keeperId = read("KEEPER_ACCOUNT_ID");
  const keeperKey = read("KEEPER_PRIVATE_KEY");
  // The keeper is optional. A half-set keeper is a mistake, not a feature.
  if (Boolean(keeperId) !== Boolean(keeperKey)) missing.push(keeperId ? "KEEPER_PRIVATE_KEY" : "KEEPER_ACCOUNT_ID");
  const port = Number(read("PORT") || "8787");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) missing.push("PORT");
  if (missing.length || !guard.ok || !relay.ok) return { ok: false, missing };
  return {
    ok: true,
    env: {
      guard: guard.env,
      relay: relay.env,
      authContractId,
      keeper: keeperId ? { accountId: keeperId, privateKey: keeperKey } : null,
      siteOrigins: origins,
      dailyCalls,
      roundBills,
      port,
    },
  };
}
