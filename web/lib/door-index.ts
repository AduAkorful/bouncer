/** Doors named by the vault contract. A failed list adds nothing. */

import { parseCard, type Card } from "./card.ts";
import type { Rpc } from "./chain.ts";
import { doorShut } from "./door.ts";
import { doorPaths, isVaultId } from "./door-read.ts";
import { parseVaultList } from "./sponsor-views.ts";
import { parseVault, viewRequest, type VaultView } from "./vault.ts";

const PAGE = 100;
const AT_ONCE = 4;

export type ListedDoor = {
  id: string;
  href: string;
  sign: string;
  name: string;
  line: string;
  /** True when this vault is shut, suspended, or could not be read. */
  shut: boolean;
  sponsored: boolean;
  /** False when this vault's own read failed. The id still came from the chain. */
  read: boolean;
  card: Card | null;
};

/** The door a plain URL should open. An open vault wins. A closed list keeps chain order. The env id is not consulted. */
export function frontDoor(doors: ListedDoor[]): ListedDoor | null {
  const readable = doors.filter((door) => door.read);
  return readable.find((door) => !door.shut) ?? readable[0] ?? null;
}

export async function readDoorIndex(
  rpc: Rpc,
  contractId: string,
  nowMs: number,
): Promise<{ ok: true; doors: ListedDoor[]; truncated: boolean } | { ok: false }> {
  const first = await rpc(viewRequest(contractId, "list_vaults", { from_index: 0, limit: PAGE }));
  const ids = first.ok ? parseVaultList(first.value) : null;
  if (!ids || !ids.ok) return { ok: false };
  let truncated = false;
  if (ids.value.length === PAGE) {
    const next = await rpc(viewRequest(contractId, "list_vaults", { from_index: PAGE, limit: 1 }));
    const more = next.ok ? parseVaultList(next.value) : null;
    truncated = !more || !more.ok || more.value.length > 0;
  }
  const doors: ListedDoor[] = [];
  const safe = ids.value.filter(isVaultId);
  for (let i = 0; i < safe.length; i += AT_ONCE) {
    const chunk = safe.slice(i, i + AT_ONCE);
    doors.push(...await Promise.all(chunk.map((id) => readListed(rpc, contractId, id, nowMs))));
  }
  return { ok: true, doors, truncated };
}

async function readListed(rpc: Rpc, contractId: string, id: string, nowMs: number): Promise<ListedDoor> {
  const href = doorPaths(id).door;
  const result = await rpc(viewRequest(contractId, "get_vault", { vault_id: id }));
  const parsed = result.ok ? parseVault(result.value) : null;
  if (!parsed || !parsed.ok) return { id, href, sign: id, name: id, line: "Could not be read", shut: true, sponsored: false, read: false, card: null };
  const card = parseCard(parsed.vault.card);
  const known = card.ok ? card.card : null;
  const state = doorState(parsed.vault, nowMs);
  return {
    id,
    href,
    sign: known?.sign ?? id,
    name: known?.name ?? id,
    line: state.line,
    shut: state.shut,
    sponsored: parsed.vault.specHash !== null,
    read: true,
    card: known,
  };
}

function doorState(vault: VaultView, nowMs: number): { line: string; shut: boolean } {
  if (vault.suspended) return { line: "Suspended", shut: true };
  const shut = doorShut(vault, nowMs);
  return { line: shut ? "Closed" : "Open", shut };
}
