import { SiteNav } from "@/components/SiteNav";
import type { Metadata } from "next";
import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { PlayerPlace } from "@/components/fame/PlayerBoard";
import { readApiBase } from "@/lib/api";
import { playerNameToStore } from "@/lib/player-name";

type Props = { params: Promise<{ name: string }> };

/** The board's own entry for this name, so the title and the share preview say what the page shows. */
async function placeOf(name: string): Promise<{ name: string; place: number; line: string } | null | "unread"> {
  const base = readApiBase(process.env.NEXT_PUBLIC_API_URL);
  if (!base) return "unread";
  try {
    const response = await fetch(`${base}/player/place/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    const body = (await response.json()) as { ok?: unknown; player?: { name: string; place: number; line: string } | null };
    return body.ok === true ? (body.player ?? null) : "unread";
  } catch {
    return "unread";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = playerNameToStore(decodeURIComponent((await params).name));
  if (!name) return screen("Not a player", "That is not a player name.", { index: false });
  const entry = await placeOf(name);
  if (entry === null) return screen("Not on the board", `${name} is not on the Bouncer board.`, { index: false });
  if (entry === "unread") return screen(name, `${name}'s place on the Bouncer board.`);
  return screen(`${entry.name} · #${entry.place}`, `${entry.line}. No bill is on this page.`, { path: `/p/${encodeURIComponent(entry.name)}`, image: `/og/p/${encodeURIComponent(entry.name)}` });
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<PlaceShell name="" pending />}>
      <Place params={params} />
    </Suspense>
  );
}

async function Place({ params }: Props) {
  const asked = playerNameToStore(decodeURIComponent((await params).name)) ?? "";
  // The page shows the player's own spelling, not the casing the link happened to use.
  const entry = asked ? await placeOf(asked) : null;
  return <PlaceShell name={entry && entry !== "unread" ? entry.name : asked} />;
}

function PlaceShell({ name, pending = false }: { name: string; pending?: boolean }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">On the board</p>
        <h1 className="mt-1 break-words font-sign text-3xl leading-tight">{name || (pending ? "" : "Not a player")}</h1>
        {name ? <PlayerPlace name={name} /> : pending ? null : <p className="mt-6 text-sm text-chalk/70">That is not a player name.</p>}
      </div>
    </main>
  );
}
