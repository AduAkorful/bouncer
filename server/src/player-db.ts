/** SurrealDB Cloud. A file on the Render disk is not used. */

import { Surreal } from "surrealdb";
import type { NightRow, PlayerRow, PlayerStore } from "./player-record.ts";

export type SurrealEnv = { url: string; user: string; pass: string; ns: string; db: string };

const KEYS = ["SURREAL_URL", "SURREAL_USER", "SURREAL_PASS", "SURREAL_NS", "SURREAL_DB"] as const;

/** No keys means the record is off. A half-set database is a missing name, not a guess. */
export function readSurrealEnv(source: Record<string, string | undefined>): { ok: true; env: SurrealEnv | null } | { ok: false; missing: string[] } {
  const values = Object.fromEntries(KEYS.map((key) => [key, source[key]?.trim() ?? ""]));
  const present = KEYS.filter((key) => values[key]);
  if (present.length === 0) return { ok: true, env: null };
  if (present.length !== KEYS.length) return { ok: false, missing: KEYS.filter((key) => !values[key]) };
  return { ok: true, env: { url: values.SURREAL_URL.replace(/\/$/, ""), user: values.SURREAL_USER, pass: values.SURREAL_PASS, ns: values.SURREAL_NS, db: values.SURREAL_DB } };
}

/** Surreal Cloud accepts the SDK over HTTPS. A websocket from the host was dropping the record. */
export function playerDbUrl(url: string): string {
  return url.startsWith("wss:") ? `https:${url.slice("wss:".length)}` : url;
}

export function surrealPlayers(env: SurrealEnv): PlayerStore {
  let ready: Promise<Surreal> | null = null;
  const db = async (): Promise<Surreal> => {
    if (!ready) {
      ready = open(env).catch((error: unknown) => {
        ready = null;
        throw error;
      });
    }
    return ready;
  };
  const rows = async (sql: string, vars: Record<string, unknown> = {}): Promise<unknown[]> => {
    try {
      const [result] = await (await db()).query(sql, vars).collect<[unknown[]]>();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      ready = null;
      throw error;
    }
  };
  return {
    async findByAccount(publicKey) {
      const found = await rows("SELECT * FROM player WHERE public_key = $publicKey LIMIT 1", { publicKey });
      return found[0] ? playerFrom(found[0]) : null;
    },
    async findByClaim(claimKey) {
      const found = await rows("SELECT * FROM player WHERE claim_key = $claimKey LIMIT 1", { claimKey });
      return found[0] ? playerFrom(found[0]) : null;
    },
    async findByName(name) {
      const found = await rows("SELECT * FROM player WHERE name = $name LIMIT 1", { name });
      return found[0] ? playerFrom(found[0]) : null;
    },
    async insert(row) { await rows("CREATE player CONTENT $row", { row: storedPlayer(row) }); },
    async save(row) { await rows("UPDATE player SET name = $row.name, rename_used = $row.rename_used, streak = $row.streak, last_day = $row.last_day, nights_in = $row.nights_in WHERE public_key = $row.public_key", { row: storedPlayer(row) }); },
    async nightsFor(claimKey) { return (await rows("SELECT * FROM night WHERE claim_key = $claimKey", { claimKey })).map(nightFrom); },
    async nightsSince(day) { return (await rows("SELECT * FROM night WHERE day >= $day", { day })).map(nightFrom); },
    async saveNight(night) {
      await rows("DELETE night WHERE claim_key = $claimKey AND vault_id = $vaultId AND round = $round", night);
      await rows("CREATE night CONTENT $night", { night: { claim_key: night.claimKey, vault_id: night.vaultId, round: night.round, state: night.state, day: night.day } });
    },
    async readBlob(claimKey, vaultId, round) {
      const found = await rows("SELECT blob FROM resume WHERE claim_key = $claimKey AND vault_id = $vaultId AND round = $round LIMIT 1", { claimKey, vaultId, round });
      const blob = (found[0] as { blob?: unknown } | undefined)?.blob;
      return typeof blob === "string" ? blob : null;
    },
    async saveBlob(claimKey, vaultId, round, blob) {
      await rows("DELETE resume WHERE claim_key = $claimKey AND vault_id = $vaultId AND round = $round", { claimKey, vaultId, round });
      await rows("CREATE resume CONTENT $row", { row: { claim_key: claimKey, vault_id: vaultId, round, blob } });
    },
    async readProgress(claimKey, vaultId, round) {
      const found = await rows("SELECT progress FROM raid_progress WHERE claim_key = $claimKey AND vault_id = $vaultId AND round = $round LIMIT 1", { claimKey, vaultId, round });
      const value = (found[0] as { progress?: unknown } | undefined)?.progress;
      return typeof value === "string" ? value : null;
    },
    async saveProgress(claimKey, vaultId, round, progress) {
      await rows("DELETE raid_progress WHERE claim_key = $claimKey AND vault_id = $vaultId AND round = $round", { claimKey, vaultId, round });
      await rows("CREATE raid_progress CONTENT $row", { row: { claim_key: claimKey, vault_id: vaultId, round, progress } });
    },
    async allPlayers() { return (await rows("SELECT * FROM player")).map(playerFrom); },
  };
}

async function open(env: SurrealEnv): Promise<Surreal> {
  const db = new Surreal();
  await db.connect(playerDbUrl(env.url));
  await db.signin({ username: env.user, password: env.pass });
  await db.use({ namespace: env.ns, database: env.db });
  await db.query([
    "DEFINE TABLE IF NOT EXISTS player SCHEMALESS",
    "DEFINE TABLE IF NOT EXISTS night SCHEMALESS",
    "DEFINE TABLE IF NOT EXISTS resume SCHEMALESS",
    "DEFINE INDEX IF NOT EXISTS player_public_key ON player FIELDS public_key UNIQUE",
    "DEFINE INDEX IF NOT EXISTS player_claim_key ON player FIELDS claim_key UNIQUE",
    "DEFINE INDEX IF NOT EXISTS player_name ON player FIELDS name UNIQUE",
  ].join(";\n")).collect();
  return db;
}

function storedPlayer(row: PlayerRow) {
  return { public_key: row.publicKey, claim_key: row.claimKey, name: row.name, rename_used: row.renameUsed, streak: row.streak, last_day: row.lastDay, nights_in: row.nightsIn, created: row.created };
}

function playerFrom(value: unknown): PlayerRow {
  const row = value as Record<string, unknown>;
  return {
    publicKey: String(row.public_key),
    claimKey: String(row.claim_key),
    name: String(row.name),
    renameUsed: row.rename_used === true,
    streak: Number(row.streak) || 0,
    lastDay: typeof row.last_day === "string" ? row.last_day : null,
    nightsIn: Number(row.nights_in) || 0,
    created: String(row.created),
  };
}

function nightFrom(value: unknown): NightRow {
  const row = value as Record<string, unknown>;
  return {
    claimKey: String(row.claim_key),
    vaultId: String(row.vault_id),
    round: String(row.round),
    state: row.state === "in" ? "in" : "opened",
    day: String(row.day),
  };
}
