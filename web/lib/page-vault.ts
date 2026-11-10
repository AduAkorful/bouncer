/** Everything a page needs to show one vault. Read on the server, from chain, with no sample data. */

import { parseCard, type Card } from "./card.ts";
import type { Rpc } from "./chain.ts";
import { parseSpecCt, parseTokenMeta } from "./sponsor-views.ts";
import { metadataRequest } from "./token.ts";
import { parseVault, viewRequest, type VaultView } from "./vault.ts";

export type PageEnv = { contractId: string };

export type TokenRead = { ok: true; symbol: string; decimals: number } | { ok: false };

export const TOKEN_LABEL_MS = 10 * 60 * 1000;

export type PageVault = {
  vaultId: string;
  vault: VaultView;
  /** `custom` when a sealed story is stored. Otherwise this vault's id. */
  venueId: string;
  card: Card | null;
  specCt: string | null;
  /** Symbol and decimals. The door does not wait for this. */
  token: Promise<TokenRead>;
};

type TokenMemory = { contractId: string; account: string; symbol: string; decimals: number; until: number };

let memory: TokenMemory | null = null;
let flight: { contractId: string; promise: Promise<TokenRead> } | null = null;

export function forgetTokenLabel() {
  memory = null;
  flight = null;
}

export function readTokenLabel(rpc: Rpc, contractId: string): Promise<TokenRead> {
  if (memory && memory.contractId === contractId && memory.until > Date.now()) {
    return Promise.resolve({ ok: true, symbol: memory.symbol, decimals: memory.decimals });
  }
  if (flight?.contractId === contractId) return flight.promise;
  const promise = loadToken(rpc, contractId)
    .then((result): TokenRead => {
      if (!result.ok) return { ok: false };
      memory = {
        contractId,
        account: result.account,
        symbol: result.symbol,
        decimals: result.decimals,
        until: Date.now() + TOKEN_LABEL_MS,
      };
      return { ok: true, symbol: result.symbol, decimals: result.decimals };
    })
    .catch(() => ({ ok: false }) as TokenRead)
    .finally(() => {
      if (flight?.promise === promise) flight = null;
    });
  flight = { contractId, promise };
  return promise;
}

async function loadToken(rpc: Rpc, contractId: string): Promise<{ ok: true; account: string; symbol: string; decimals: number } | { ok: false }> {
  const account = await rpc(viewRequest(contractId, "get_usdc_account", {}));
  if (!account.ok || typeof account.value !== "string" || account.value.length === 0) return { ok: false };
  const meta = await rpc(metadataRequest(account.value));
  const parsed = meta.ok ? parseTokenMeta(meta.value) : null;
  if (!parsed || !parsed.ok) return { ok: false };
  return { ok: true, account: account.value, symbol: parsed.value.symbol, decimals: parsed.value.decimals };
}

/**
 * A vault with no sealed story plays one of the guard's built-in venues, which are named without the round suffix:
 * `velvet-1` is the `velvet` venue. Sending the vault id itself made the guard refuse the door as an unknown venue.
 */
export function builtInVenue(vaultId: string): string {
  const match = /^(velvet|lions|builders|cuts)(?:-[A-Za-z0-9._-]*)?$/.exec(vaultId);
  return match ? match[1] : vaultId;
}

export async function readPageVault(rpc: Rpc, env: PageEnv, vaultId: string): Promise<{ ok: true; page: PageVault } | { ok: false; error: string }> {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(vaultId)) return { ok: false, error: "id" };
  const token = readTokenLabel(rpc, env.contractId);
  const vaultResult = await rpc(viewRequest(env.contractId, "get_vault", { vault_id: vaultId }));
  if (!vaultResult.ok) return { ok: false, error: "vault" };
  const parsed = parseVault(vaultResult.value);
  if (!parsed.ok) return { ok: false, error: parsed.error === "missing vault" ? "missing vault" : "vault" };
  const vault = parsed.vault;
  if (!vault.specHash) {
    return { ok: true, page: { vaultId, vault, venueId: builtInVenue(vaultId), card: null, specCt: null, token } };
  }
  const spec = await rpc(viewRequest(env.contractId, "get_spec", { vault_id: vaultId }));
  const ct = spec.ok ? parseSpecCt(spec.value) : null;
  if (!ct || !ct.ok || ct.value === null) return { ok: false, error: "spec" };
  const card = parseCard(vault.card);
  return {
    ok: true,
    page: {
      vaultId,
      vault,
      venueId: "custom",
      card: card.ok ? card.card : null,
      specCt: ct.value,
      token,
    },
  };
}

export { parseVault };
