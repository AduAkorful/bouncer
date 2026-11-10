import { connection } from "next/server";
import { readApiBase } from "@/lib/api";
import { cardResponse, DEFAULT_CARD } from "@/lib/og-card";
import { playerNameToStore } from "@/lib/player-name";

type Entry = { name: string; place: number; nights: number; streak: number };

/** A player's card, drawn from the board. A name that is not on the board gets the site card. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  await connection();
  const name = playerNameToStore(decodeURIComponent((await params).name));
  const base = readApiBase(process.env.NEXT_PUBLIC_API_URL);
  if (!name || !base) return cardResponse(DEFAULT_CARD, 300);
  let entry: Entry | null = null;
  try {
    const response = await fetch(`${base}/player/place/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    const body = (await response.json()) as { ok?: unknown; player?: Entry | null };
    entry = body.ok === true ? (body.player ?? null) : null;
  } catch {
    entry = null;
  }
  if (!entry) return cardResponse(DEFAULT_CARD, 60);
  const nights = `${entry.nights} ${entry.nights === 1 ? "night" : "nights"} in`;
  return cardResponse(
    {
      sign: entry.name,
      line: `#${entry.place} on the board`,
      detail: `${nights} · ${entry.streak}-day streak`,
      stamp: entry.nights > 0 ? { text: "GOT IN.", color: "#4fd18b" } : undefined,
    },
    600,
  );
}
