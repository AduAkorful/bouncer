/** Vault views. A missing field or a failed read does not become a number. */

export type VaultView = {
  sponsor: string;
  pot: string;
  dayPot: string;
  reserved: string;
  cap: string;
  lockNs: string;
  rule: "PayTheBill" | "SplitTheDay";
  guardPk: string | null;
  commitment: string | null;
  guardVersion: string | null;
  round: string;
  opensAt: string;
  closesAt: string;
  open: boolean;
  challengeEnd: string | null;
  maxCracks: number;
  ticketed: boolean;
  closedPendingBump: boolean;
  refundInFlight: string;
  crackCount: number;
};

export type CrackView = {
  playerId: string;
  claimPk: string;
  amount: string;
  recordedAt: string;
  unlockAt: string;
  expiresAt: string;
  status: string;
};

export function viewRequest(contractId: string, method: string, args: Record<string, unknown>) {
  return {
    jsonrpc: "2.0",
    id: "view",
    method: "query",
    params: {
      request_type: "call_function",
      finality: "final",
      account_id: contractId,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args), "utf8").toString("base64"),
    },
  };
}

export function parseRpcJson(body: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "rpc" };
  const record = body as Record<string, unknown>;
  if (record.error) return { ok: false, error: "rpc" };
  const result = record.result;
  if (!result || typeof result !== "object") return { ok: false, error: "rpc" };
  const bytes = (result as Record<string, unknown>).result;
  if (!Array.isArray(bytes) || bytes.some((byte) => typeof byte !== "number" || byte < 0 || byte > 255)) {
    return { ok: false, error: "rpc" };
  }
  try {
    return { ok: true, value: JSON.parse(quoteUnsafeIntegers(Buffer.from(bytes).toString("utf8"))) };
  } catch {
    return { ok: false, error: "rpc" };
  }
}

/** A nanosecond timestamp does not fit in a safe integer. Keep it as a string. */
export function quoteUnsafeIntegers(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '"') {
      const start = i;
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      out += text.slice(start, i);
      continue;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      const start = i;
      if (text[i] === "-") i += 1;
      const digitsStart = i;
      while (i < text.length && text[i] >= "0" && text[i] <= "9") i += 1;
      const fractional = text[i] === "." || text[i] === "e" || text[i] === "E";
      if (!fractional && i - digitsStart >= 16) out += `"${text.slice(start, i)}"`;
      else out += text.slice(start, i);
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

export function parseVault(value: unknown): { ok: true; vault: VaultView } | { ok: false; error: string } {
  if (value === null) return { ok: false, error: "missing vault" };
  if (!value || typeof value !== "object") return { ok: false, error: "vault" };
  const row = value as Record<string, unknown>;
  const rule = row.rule;
  if (rule !== "PayTheBill" && rule !== "SplitTheDay") return { ok: false, error: "vault" };
  const sponsor = text(row.sponsor);
  const pot = digits(row.pot);
  const dayPot = digits(row.day_pot);
  const reserved = digits(row.reserved);
  const cap = digits(row.cap);
  const lockNs = digits(row.lock_ns);
  const round = digits(row.round);
  const opensAt = digits(row.opens_at);
  const closesAt = digits(row.closes_at);
  const refundInFlight = digits(row.refund_in_flight);
  const maxCracks = count(row.max_cracks);
  const crackCount = count(row.crack_count);
  const guardPk = hash(row.guard_pk);
  const commitment = hash(row.commitment);
  const guardVersion = hash(row.guard_version);
  const challengeEnd = row.challenge_end === null ? null : digits(row.challenge_end);
  if (
    !sponsor ||
    !pot ||
    !dayPot ||
    !reserved ||
    !cap ||
    !lockNs ||
    !round ||
    !opensAt ||
    !closesAt ||
    !refundInFlight ||
    maxCracks === null ||
    crackCount === null ||
    guardPk === undefined ||
    commitment === undefined ||
    guardVersion === undefined ||
    challengeEnd === undefined ||
    typeof row.open !== "boolean" ||
    typeof row.ticketed !== "boolean" ||
    typeof row.closed_pending_bump !== "boolean"
  ) {
    return { ok: false, error: "vault" };
  }
  return {
    ok: true,
    vault: {
      sponsor,
      pot,
      dayPot,
      reserved,
      cap,
      lockNs,
      rule,
      guardPk,
      commitment,
      guardVersion,
      round,
      opensAt,
      closesAt,
      open: row.open,
      challengeEnd,
      maxCracks,
      ticketed: row.ticketed,
      closedPendingBump: row.closed_pending_bump,
      refundInFlight,
      crackCount,
    },
  };
}

export function parseCrack(value: unknown): { ok: true; crack: CrackView | null } | { ok: false; error: string } {
  if (value === null) return { ok: true, crack: null };
  if (!value || typeof value !== "object") return { ok: false, error: "crack" };
  const row = value as Record<string, unknown>;
  const playerId = text(row.player_id);
  const claimPk = hash(row.claim_pk);
  const amount = digits(row.amount);
  const recordedAt = digits(row.recorded_at);
  const unlockAt = digits(row.unlock_at);
  const expiresAt = digits(row.expires_at);
  const status = text(row.status);
  if (!playerId || claimPk === undefined || claimPk === null || !amount || !recordedAt || !unlockAt || !expiresAt || !status) {
    return { ok: false, error: "crack" };
  }
  return { ok: true, crack: { playerId, claimPk, amount, recordedAt, unlockAt, expiresAt, status } };
}

export function parseOwner(value: unknown): { ok: true; owner: string } | { ok: false; error: string } {
  const owner = text(value);
  if (!owner) return { ok: false, error: "owner" };
  return { ok: true, owner };
}

/** An unticketed vault can be submitted by the relay. Anything else is not sent. */
export function guestCanSubmit(vault: VaultView, owner: string, relayAccount: string): { ok: true } | { ok: false; error: string } {
  if (vault.ticketed) return { ok: false, error: "ticketed" };
  if (owner === relayAccount) return { ok: false, error: "relay is owner" };
  return { ok: true };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function digits(value: unknown): string | null {
  if (typeof value === "string" && /^[0-9]+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function count(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function hash(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 32) return undefined;
  let hex = "";
  for (const byte of value) {
    if (typeof byte !== "number" || byte < 0 || byte > 255 || !Number.isInteger(byte)) return undefined;
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
