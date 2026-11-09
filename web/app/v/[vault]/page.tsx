import type { Metadata } from "next";
import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { connection } from "next/server";
import { HomeGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";
import { httpRpc, PAGE_READ_MS } from "@/lib/chain";
import { readPublicEnv } from "@/lib/config";
import { readPageVault } from "@/lib/page-vault";

type Props = { params: Promise<{ vault: string }> };

/** The tab and the share preview name the door by its sign. The in-flight read is shared with the page's own. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // A chain read belongs to the request, the same as the gate's.
  await connection();
  const id = decodeURIComponent((await params).vault);
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return screen(id, "A door run by a sponsor.");
  const rpc = httpRpc(labels.env.rpcUrl, fetch, { signal: AbortSignal.timeout(PAGE_READ_MS), fallbackUrl: labels.env.rpcFallbackUrl });
  const page = await readPageVault(rpc, { contractId: labels.env.contractId }, id);
  if (!page.ok) {
    if (page.error === "missing vault" || page.error === "id") return screen("No door", "No vault uses that id.", { index: false });
    return screen(id, "A door run by a sponsor.");
  }
  const card = page.page.card;
  if (!card) return screen(id, "A door run by a sponsor.");
  return screen(card.sign, card.pitch || `${card.name} is on the door.`);
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<NightShell />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: Props) {
  const { vault } = await params;
  return <HomeGate vaultId={decodeURIComponent(vault)} />;
}
