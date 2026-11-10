/** Views a sponsor page reads. A missing field or a failed read is an error, never a number. */

export type LimitsView = {
  selfServe: boolean;
  maxCap: string;
  maxCracks: number;
  minLockNs: string;
  maxLockNs: string;
  maxOpenLeadNs: string;
  maxSpecCt: number;
  maxCard: number;
  defaultGuardPk: string | null;
  reservedPrefixes: string[];
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseLimits(value: unknown): Parsed<LimitsView> {
  if (!value || typeof value !== "object") return { ok: false, error: "limits" };
  const row = value as Record<string, unknown>;
  const maxCap = digits(row.max_cap);
  const minLockNs = digits(row.min_lock_ns);
  const maxLockNs = digits(row.max_lock_ns);
  const maxOpenLeadNs = digits(row.max_open_lead_ns);
  const maxCracks = whole(row.max_cracks);
  const maxSpecCt = whole(row.max_spec_ct);
  const maxCard = whole(row.max_card);
  const pk = key(row.default_guard_pk);
  const prefixes = row.reserved_prefixes;
  if (
    typeof row.self_serve !== "boolean" ||
    !maxCap ||
    !minLockNs ||
    !maxLockNs ||
    !maxOpenLeadNs ||
    maxCracks === null ||
    maxSpecCt === null ||
    maxCard === null ||
    pk === undefined ||
    !Array.isArray(prefixes) ||
    prefixes.some((p) => typeof p !== "string")
  ) {
    return { ok: false, error: "limits" };
  }
  return {
    ok: true,
    value: {
      selfServe: row.self_serve,
      maxCap,
      maxCracks,
      minLockNs,
      maxLockNs,
      maxOpenLeadNs,
      maxSpecCt,
      maxCard,
      defaultGuardPk: pk,
      reservedPrefixes: prefixes as string[],
    },
  };
}

/** The sealed spec comes back as base64. The guard takes it as hex. */
export function parseSpecCt(value: unknown): Parsed<string | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return { ok: false, error: "spec" };
  return { ok: true, value: Buffer.from(value, "base64").toString("hex") };
}

export function parseVaultList(value: unknown): Parsed<string[]> {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || id.length === 0)) return { ok: false, error: "list" };
  return { ok: true, value: value as string[] };
}

export type TokenMeta = { symbol: string; decimals: number };

/**
 * The test token calls itself USDC on chain. On testnet every amount says tUSDC, so a pot is never mistaken for
 * real USDC. Another symbol is shown as the token gives it.
 */
export function testnetSymbol(symbol: string): string {
  return symbol === "USDC" && process.env.NEXT_PUBLIC_NETWORK_ID === "testnet" ? "tUSDC" : symbol;
}

export function parseTokenMeta(value: unknown): Parsed<TokenMeta> {
  if (!value || typeof value !== "object") return { ok: false, error: "token" };
  const row = value as Record<string, unknown>;
  const decimals = row.decimals;
  if (typeof row.symbol !== "string" || row.symbol.length === 0 || !Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 36) {
    return { ok: false, error: "token" };
  }
  return { ok: true, value: { symbol: testnetSymbol(row.symbol), decimals: decimals as number } };
}

/** A token balance is a decimal string. */
export function parseBalance(value: unknown): Parsed<string> {
  const balance = digits(value);
  return balance === null ? { ok: false, error: "balance" } : { ok: true, value: balance };
}

function digits(value: unknown): string | null {
  if (typeof value === "string" && /^[0-9]+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function whole(value: unknown): number | null {
  const text = digits(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function key(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 32) return undefined;
  let hex = "";
  for (const byte of value) {
    if (typeof byte !== "number" || !Number.isInteger(byte) || byte < 0 || byte > 255) return undefined;
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
