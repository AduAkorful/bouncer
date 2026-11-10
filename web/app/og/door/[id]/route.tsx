import { connection } from "next/server";
import { readPublicEnv } from "@/lib/config";
import { doorShut } from "@/lib/door";
import { cardResponse, DEFAULT_CARD } from "@/lib/og-card";
import { readPageVault } from "@/lib/page-vault";
import { pageRpc } from "@/lib/page-rpc";
import { formatAtomic } from "@/lib/units";

/** A door's card, drawn from its public card and tonight's pot. An unknown id gets the site card. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = decodeURIComponent((await params).id);
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return cardResponse(DEFAULT_CARD, 300);
  const rpc = pageRpc(labels.env);
  const page = await readPageVault(rpc, { contractId: labels.env.contractId }, id);
  if (!page.ok) return cardResponse(DEFAULT_CARD, 60);
  const { card, vault } = page.page;
  const token = await page.page.token;
  const shut = doorShut(vault, Date.now());
  const pot = token.ok ? formatAtomic(vault.dayPot, token.decimals) : null;
  const line = shut ? "The door is closed tonight." : pot && token.ok ? `Tonight's pot: ${pot} ${token.symbol}` : "The door is open tonight.";
  return cardResponse(
    {
      sign: card?.sign || id,
      line,
      detail: card ? [card.name ? `Guard ${card.name}` : "", card.pitch].filter(Boolean).join(" · ") : "Get a bill past the door.",
      stamp: shut ? undefined : { text: "OPEN", color: "#4fd18b" },
    },
    300,
  );
}
