import Link from "next/link";
import { DemoBadge, FrameNav, NetworkTag } from "@/components/bits";
import { Goer } from "@/components/Goer";
import { crew } from "@/lib/demo/crew";
import { raid, streak, today, venue } from "@/lib/demo/raider";

const you = crew.members[0]!.look;

const history = [
  { night: `Daily #${today.number}`, door: venue.name, result: "In progress", href: "/frames/play" },
  { night: `Daily #${today.number - 1}`, door: venue.name, result: "Missed the promoter line", href: "/frames/reveal" },
  { night: "Practice", door: "Kofi's Corner", result: "Ledger opened after", href: "/frames/practice" },
];

export default function ProfileFrame() {
  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">kwesi.near</p>
            <h1 className="mt-1 font-sign text-3xl leading-none">{raid.player}</h1>
            <p className="mt-2 text-sm text-chalk/60">The Queue · on your wrist</p>
          </div>
          <div className="h-36 w-20 overflow-hidden rounded-2xl bg-[#140f1c] ring-1 ring-white/10">
            <svg viewBox="-40 -155 80 168" className="h-full w-full" role="img" aria-label="Kwesi, in a jacket, looking toward the door">
              <Goer x={0} y={6} s={1} look={you} rim="#b9a2ff" dark={0.12} />
            </svg>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat k="Streak" v={`${streak.days}`} sub={`best ${streak.best}`} />
          <Stat k="Rank" v="Queue" sub="one from The Door" />
          <Stat k="Tickets" v="2" sub="daily + practice" />
        </div>

        <section id="wristband" className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">Wristband</h2>
          <p className="mt-2 text-sm text-chalk/70">
            The Queue opens tonight&apos;s door. Accra Lions and Osu Builders ask for The Door. That rank is one step up: finish a week of streaks, or train a bouncer.
          </p>
          <Link href="/frames/creator" className="mt-3 inline-block text-sm text-uv-glow">
            Train a bouncer
          </Link>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">History</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {history.map((h) => (
              <li key={h.night}>
                <Link href={h.href} className="flex items-baseline justify-between gap-3 py-3">
                  <span>
                    <span className="block text-sm font-semibold">{h.door}</span>
                    <span className="font-mono text-[11px] text-chalk/45">{h.night}</span>
                  </span>
                  <span className="text-right text-sm text-chalk/70">{h.result}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">Case notes</h2>
          <ul className="mt-3 space-y-2">
            {raid.notes.map((n) => (
              <li key={n} className="rounded-xl bg-night px-3 py-2 text-sm text-chalk/80">
                {n}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-chalk/45">Notes describe what you already saw. They never include a ledger value from an open door.</p>
        </section>

        <div className="mt-5 flex items-center justify-between">
          <NetworkTag className="text-chalk/60" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="profile" />
    </main>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-2 px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">{k}</div>
      <div className="font-sign text-xl leading-tight">{v}</div>
      <div className="text-[11px] text-chalk/50">{sub}</div>
    </div>
  );
}
