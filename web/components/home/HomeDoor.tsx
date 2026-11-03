import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Money, NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { formatAtomic } from "@/lib/units";
import type { VaultView } from "@/lib/vault";

const otherDoors = [
  { name: "Accra Lions FC", kind: "Club treasurer", tone: "#2c6e49", href: "/venue/lions" },
  { name: "Osu Builders", kind: "DAO treasury", tone: "#3b4a8f", href: "/venue/builders" },
  { name: "Kofi's Corner", kind: "Practice room", tone: "#7a5a20", href: "/practice" },
];

const wristbands = [
  { name: "The Queue", line: "Today's door, every day", color: "#efe8da", here: true, href: "/play" },
  { name: "The Door", line: "Preview · Lions and Builders", color: "#8f6bff", here: false, href: "/venue/lions" },
  { name: "VIP", line: "Steward a sponsored vault", color: "#cfa349", here: false, href: "/vip" },
];

const phaseCopy = {
  open: {
    line: "One of my payees changed bank details tonight. Think you can get past me?",
    note: "No sign-up · messages on the door · back office tonight",
  },
  cracked: {
    line: "People got in. The pot is splitting. The list stays up until reset.",
    note: "The door is open · the ledger is still live",
  },
  closed: {
    line: "Last call is over. The door is shut.",
    note: "Reset is the next thing on this door",
  },
} as const;

export function HomeDoor({
  vault,
  currency,
  decimals,
  networkTag,
  notice,
}: {
  vault: VaultView | null;
  currency?: string;
  decimals?: number;
  networkTag?: string;
  notice?: string;
}) {
  const phase = !vault ? "closed" : !vault.open ? "closed" : vault.crackCount > 0 ? "cracked" : "open";
  const pot = vault && decimals !== undefined ? formatAtomic(phase === "cracked" ? vault.dayPot : vault.open ? vault.dayPot : vault.pot, decimals) : undefined;
  const commitment = vault?.commitment;
  return (
    <main className="min-h-dvh bg-night pb-24 text-chalk">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <span className="font-sign text-lg drop-shadow">BOUNCER</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <NetworkTag label={networkTag} className="bg-black/40 text-chalk/80 backdrop-blur" />
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 font-mono text-xs backdrop-blur">
            <span className="h-2 w-4 rounded-sm bg-chalk" aria-hidden /> Queue
          </span>
          <Link href="/profile" className="whitespace-nowrap rounded-full bg-black/50 px-2.5 py-1 font-mono text-xs backdrop-blur">
            Profile
          </Link>
        </div>
      </header>

      <section className="relative h-[46dvh] min-h-[280px] bg-[#1a1424] sm:h-[70dvh] sm:min-h-[420px]">
        <SceneLife className="absolute inset-0">
          <DoorScene
            sign="THE VELVET"
            open={phase === "cracked"}
            p="home"
            className="size-full"
            back={
              <g aria-hidden>
                <text x="134" y="128" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="6" fill="#efe8da" opacity="0.7">
                  IN
                </text>
                <g stroke="#efe8da" strokeWidth="1.4" opacity="0.8">
                  {Array.from({ length: vault?.crackCount ?? 0 }, (_, i) => (
                    <line key={i} x1={124 + i * 3.5} y1="132" x2={124 + i * 3.5} y2="144" />
                  ))}
                </g>
              </g>
            }
            front={
              <g aria-label={pot ? `Tonight's pot ${pot} ${currency}` : "Tonight's pot unavailable"}>
                <path d="M282,224 L290,166 M330,224 L322,166" stroke="#5a4630" strokeWidth="3" />
                <rect x="281" y="156" width="50" height="58" rx="3" fill="#1b2420" stroke="#5a4630" strokeWidth="3" />
                <g transform="rotate(-3 306 185)">
                  <text x="306" y="170" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" letterSpacing="0.3" fill="#efe8da" opacity="0.85">
                    TONIGHT&apos;S POT
                  </text>
                  {pot ? (
                    <text x="306" y="188" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="11" fill="#f0d48f">
                      {pot}
                    </text>
                  ) : null}
                  {currency ? (
                    <text x="306" y="202" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" fill="#efe8da" opacity="0.75">
                      {currency}
                    </text>
                  ) : null}
                </g>
              </g>
            }
          />
        </SceneLife>
        {vault ? (
          <div className="absolute right-3 top-14 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-chalk/80 backdrop-blur">
            {vault.crackCount} in
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-xl px-4">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">BIG SAM</span>
            {vault ? <span className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Round {vault.round}</span> : null}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
                {vault ? (phase === "cracked" ? "Splitting now" : phase === "closed" ? "Closed" : "Tonight's pot") : "No vault"}
              </div>
              {pot && currency ? <Money text={pot} currency={currency} className="text-2xl text-brass" /> : <p className="text-sm text-chalk/60">No pot is stored.</p>}
            </div>
            {vault ? (
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">Closes</div>
                <Countdown endsAtNs={vault.closesAt} className="text-chalk" />
              </div>
            ) : null}
          </div>
          <p className="mt-3 font-sign text-xl leading-tight sm:text-2xl">{notice ?? phaseCopy[phase].line}</p>
          {vault?.open ? (
            <a
              href="/play"
              className="mt-5 block rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
            >
              Join the queue
            </a>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 py-4 text-center font-sign text-xl text-chalk/50">
              {vault ? "The queue is closed" : "The queue is not open"}
            </p>
          )}
          <p className="mt-3 text-center text-sm text-chalk/60">{vault ? phaseCopy[phase].note : "Nothing on this door was filled in."}</p>
          <p className="mt-2 text-center text-sm">
            <Link href="/reveal" className="text-chalk/70 underline decoration-white/20">
              Last night&apos;s door
            </Link>
          </p>
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-5xl gap-8 px-4 lg:grid-cols-2">
        <section>
          <h2 className="font-sign text-lg">Down the street</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {otherDoors.map((door) => (
              <Link key={door.name} href={door.href} className="w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-night-2">
                <svg viewBox="0 0 160 100" className="block w-full bg-[#1a1424]" aria-hidden>
                  <rect y="84" width="160" height="16" fill="#120e18" />
                  <rect x="56" y="22" width="48" height="62" rx="2" fill="#0a0810" stroke={door.tone} strokeWidth="2" />
                  <rect x="58" y="24" width="44" height="58" fill={door.tone} opacity="0.25" />
                </svg>
                <div className="p-3">
                  <div className="font-sign text-sm leading-tight">{door.name}</div>
                  <div className="mt-0.5 text-xs text-chalk/60">{door.kind}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-sign text-lg">Your wristband</h2>
          <div className="mt-3 space-y-2">
            {wristbands.map((band) => (
              <Link
                key={band.name}
                href={band.href}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${band.here ? "border-chalk/40 bg-night-2" : "border-white/10"}`}
              >
                <span className="h-3.5 w-10 rounded-sm" style={{ background: band.color }} />
                <div className="flex-1">
                  <div className="font-sign text-sm">{band.name}</div>
                  <div className="text-xs text-chalk/60">{band.line}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className="mx-auto mt-8 max-w-5xl px-4 font-mono text-[11px] text-chalk/50">
        {commitment ? (
          <span>
            <span className="text-uv-glow">●</span> Tonight&apos;s ledger committed before the door opened · {commitment}
          </span>
        ) : (
          <span>No commitment is stored on this vault.</span>
        )}
      </footer>
    </main>
  );
}
