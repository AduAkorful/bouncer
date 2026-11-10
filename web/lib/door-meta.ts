import type { Metadata } from "next";
import { connection } from "next/server";
import { readPublicEnv } from "./config.ts";
import { readPageVault } from "./page-vault.ts";
import { pageRpc } from "./page-rpc.ts";
import { screen } from "./screen.ts";

/**
 * A door's sub-page titled with its sign, such as "COASTLINE NIGHT · The queue", so tabs and shares say which
 * door it is (QA R21 VS-22). The read is the page's own cached one, so the title costs no extra chain call.
 */
export async function doorPageScreen(rawId: string, page: string, description: string, path: string): Promise<Metadata> {
  await connection();
  const id = decodeURIComponent(rawId);
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return screen(page, description, { index: false });
  const read = await readPageVault(pageRpc(labels.env), { contractId: labels.env.contractId }, id);
  const sign = read.ok ? read.page.card?.sign || id : id;
  return screen(`${sign} · ${page}`, description, { index: false, path: `/v/${encodeURIComponent(id)}${path}`, image: `/og/door/${encodeURIComponent(id)}` });
}
