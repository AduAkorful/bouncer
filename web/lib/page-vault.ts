/** Everything a page needs to show one vault. Read on the server, from chain, with no sample data. */

import { parseCard, type Card } from "./card.ts";
import { readDoor, type Rpc } from "./chain.ts";
import { parseSpecCt, parseTokenMeta } from "./sponsor-views.ts";
import { metadataRequest } from "./token.ts";
import { parseVault, viewRequest, type VaultView } from "./vault.ts";

export type PageEnv = { contractId: string; defaultVaultId: string; currency: string; decimals: number; venue: string };

export type PageVault = {
  vaultId: string;
  vault: VaultView;
  owner: string;
  /** `custom` for a sponsor's story. Otherwise the built-in venue named in env. */
  venueId: string;
  card: Card | null;
  specCt: string | null;
  currency: string;
  decimals: number;
};

export async function readPageVault(rpc: Rpc, env: PageEnv, vaultId?: string): Promise<{ ok: true; page: PageVault } | { ok: false; error: string }> {
  const id = vaultId ?? env.defaultVaultId;
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(id)) return { ok: false, error: "id" };
  const account = rpc(viewRequest(env.contractId, "get_usdc_account", {}));
  const door = await readDoor(rpc, env.contractId, id);
  if (!door.ok) return { ok: false, error: door.error === "missing vault" ? "missing vault" : "vault" };
  const vault = door.vault;
  if (!vault.specHash) {
    // A built-in door has no sealed story. Its unit still comes from the token, the same read a sponsor door uses.
    if (id !== env.defaultVaultId) return { ok: false, error: "no story" };
    const label = await readToken(rpc, await account);
    if (!label.ok) return { ok: false, error: "token" };
    return { ok: true, page: { vaultId: id, vault, owner: door.owner, venueId: env.venue, card: null, specCt: null, currency: label.symbol, decimals: label.decimals } };
  }
  const [spec, label] = await Promise.all([
    rpc(viewRequest(env.contractId, "get_spec", { vault_id: id })),
    account.then((read) => readToken(rpc, read)),
  ]);
  const ct = spec.ok ? parseSpecCt(spec.value) : null;
  if (!ct || !ct.ok || ct.value === null) return { ok: false, error: "spec" };
  const parsed = parseCard(vault.card);
  if (!label.ok) return { ok: false, error: "token" };
  return {
    ok: true,
    page: {
      vaultId: id,
      vault,
      owner: door.owner,
      venueId: "custom",
      card: parsed.ok ? parsed.card : null,
      specCt: ct.value,
      currency: label.symbol,
      decimals: label.decimals,
    },
  };
}

async function readToken(rpc: Rpc, account: { ok: true; value: unknown } | { ok: false; error: string }): Promise<{ ok: true; symbol: string; decimals: number } | { ok: false }> {
  if (!account.ok || typeof account.value !== "string") return { ok: false };
  const meta = await rpc(metadataRequest(account.value));
  const parsed = meta.ok ? parseTokenMeta(meta.value) : null;
  return parsed && parsed.ok ? { ok: true, symbol: parsed.value.symbol, decimals: parsed.value.decimals } : { ok: false };
}

export { parseVault };
