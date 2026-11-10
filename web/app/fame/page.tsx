import { SiteNav } from "@/components/SiteNav";
import { screen } from "@/lib/screen";
import { PlayerBoard } from "@/components/fame/PlayerBoard";

export const metadata = screen("Hall of fame", "Everyone who has raided a door, ranked by nights in, then by streak. The bill that worked stays off this page.", { path: "/fame" });

export default function FamePage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Hall of fame</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Names, not ledgers.</h1>
        <p className="mt-2 text-sm text-chalk/65">A place shows the nights and the streak. It never shows the bill that worked.</p>
        <noscript><p className="mt-4 text-sm text-chalk/70">The board needs JavaScript to load. Turn it on to see who is ranked.</p></noscript>
        <PlayerBoard />
      </div>
    </main>
  );
}
