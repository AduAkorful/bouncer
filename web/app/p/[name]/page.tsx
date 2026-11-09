import type { Metadata } from "next";
import { screen } from "@/lib/screen";
import Link from "next/link";
import { Suspense } from "react";
import { PlayerBoard } from "@/components/fame/PlayerBoard";
import { playerNameToStore } from "@/lib/player-name";

/** A shared place link names the player. The place itself is read in the browser, so it is not in the preview. */
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const name = playerNameToStore(decodeURIComponent((await params).name));
  if (!name) return screen("Not a player", "That is not a player name.", { index: false });
  return screen(`${name} on the board`, `${name}'s place on the Bouncer board. No bill is on this page.`);
}

export default function Page({ params }: { params: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={<PlaceShell name="" pending />}>
      <Place params={params} />
    </Suspense>
  );
}

async function Place({ params }: { params: Promise<{ name: string }> }) {
  const name = playerNameToStore(decodeURIComponent((await params).name)) ?? "";
  return <PlaceShell name={name} />;
}

function PlaceShell({ name, pending = false }: { name: string; pending?: boolean }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">A place</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">{name || "A place"}</h1>
        {name ? <PlayerBoard highlight={name} /> : pending ? null : <p className="mt-6 text-sm text-chalk/70">That is not a player name.</p>}
        <Link href="/fame" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The board
        </Link>
      </div>
    </main>
  );
}
