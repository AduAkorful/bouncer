import { screen } from "@/lib/screen";
import Link from "next/link";
import { PlayerBoard } from "@/components/fame/PlayerBoard";
import { playerNameToStore } from "@/lib/player-name";

export function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return params.then(({ name }) => screen(playerNameToStore(decodeURIComponent(name)) ?? "A player", "A place on the board. No bill is on this page."));
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const name = playerNameToStore(decodeURIComponent((await params).name)) ?? "";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">A place</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">{name || "No name"}</h1>
        <PlayerBoard highlight={name} />
        <Link href="/fame" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The board
        </Link>
      </div>
    </main>
  );
}
