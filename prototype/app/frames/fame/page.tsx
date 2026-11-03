import Link from "next/link";
import { DemoBadge, FrameNav } from "@/components/bits";

const board = [
  { name: "Kwesi", door: "The Velvet", line: "In on message 4 · streak 9", rank: "The Queue" },
  { name: "Ama Owusu", door: "Osu Cuts", line: "Her bouncer held · 0 cracks this week", rank: "Owner" },
  { name: "Night Shift", door: "The Velvet", line: "Crew crack · 6 messages shared", rank: "Crew" },
  { name: "Esi", door: "Kofi's Corner", line: "Practice only · no prize", rank: "The Queue" },
  { name: "Kojo", door: "Accra Lions", line: "Turned away · streak paused", rank: "The Queue" },
];

export default function FameFrame() {
  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Hall of fame</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Names, not ledgers.</h1>
        <p className="mt-2 text-sm text-chalk/65">A crack shows the night. It never shows the bill that worked.</p>
        <ol className="mt-6 space-y-2">
          {board.map((row, i) => (
            <li key={row.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
              <span className="font-sign text-lg text-chalk/40">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-sign text-sm">{row.name}</div>
                <div className="truncate text-xs text-chalk/60">
                  {row.door} · {row.line}
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">{row.rank}</span>
            </li>
          ))}
        </ol>
        <Link href="/frames/profile" className="mt-6 block text-center text-sm text-chalk/60 underline decoration-white/20">
          Your wristband
        </Link>
        <DemoBadge className="mt-6 block" />
      </div>
      <FrameNav current="fame" />
    </main>
  );
}
