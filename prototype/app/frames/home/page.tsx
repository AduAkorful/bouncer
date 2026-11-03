"use client";

import Link from "next/link";
import { useState } from "react";
import { Chatter } from "@/components/Chatter";
import { Countdown } from "@/components/Countdown";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { dailyVault, streak, ticker, today, venue, verdict } from "@/lib/demo/raider";

const otherDoors = [
  { name: "Accra Lions FC", kind: "Club treasurer", lock: null, tone: "#2c6e49", href: "/frames/venue/lions" },
  { name: "Osu Builders", kind: "DAO treasury", lock: null, tone: "#3b4a8f", href: "/frames/venue/builders" },
  { name: "Kofi's Corner", kind: "Practice room · unlimited", lock: null, tone: "#7a5a20", href: "/frames/practice" },
];

const wristbands = [
  { name: "The Queue", line: "Today's door, every day", color: "#efe8da", here: true, href: "/frames/play" },
  { name: "The Door", line: "Preview · Lions and Builders", color: "#8f6bff", here: false, href: "/frames/venue/lions" },
  { name: "VIP", line: "Steward a sponsored vault", color: "#cfa349", here: false, href: "/frames/vip" },
];

type DoorPhase = "open" | "cracked" | "imminent";

const phaseCopy: Record<DoorPhase, { line: string; note: string }> = {
  open: {
    line: "One of my payees changed bank details tonight. Think you can get past me?",
    note: "No sign-up · 6 messages · back office tonight",
  },
  cracked: {
    line: "Three got in. The pot is splitting. The list stays up until reset.",
    note: "The door is open · the ledger is still live",
  },
  imminent: {
    line: "Last call. I close at midnight. One bill if you're quick.",
    note: "Reset is the next thing on this door",
  },
};

export default function HomeFrame() {
  const [phase, setPhase] = useState<DoorPhase>("open");
  return (
    <main className="min-h-dvh bg-night pb-24 text-chalk">
      {/* HUD */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <span className="font-sign text-lg drop-shadow">BOUNCER</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="rounded-full bg-black/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-chalk/80 backdrop-blur sm:hidden">Testnet</span>
          <span className="hidden sm:block">
            <NetworkTag className="bg-black/40 text-chalk/80 backdrop-blur" />
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 font-mono text-xs backdrop-blur">
            <span className="h-2 w-4 rounded-sm bg-chalk" aria-hidden /> Queue
          </span>
          <Link href="/frames/profile" className="whitespace-nowrap rounded-full bg-black/50 px-2.5 py-1 font-mono text-xs backdrop-blur">
            🔥 {streak.days}
          </Link>
        </div>
      </header>

      {/* The street: today's door is the hero */}
      <section className="relative h-[46dvh] min-h-[280px] bg-[#1a1424] sm:h-[70dvh] sm:min-h-[420px]">
        <SceneLife className="absolute inset-0">
          <DoorScene
            sign={venue.name.toUpperCase()}
            open={phase === "cracked"}
            p="home"
            className="size-full"
            back={
              <g aria-hidden>
                {/* Tally of who got in today, chalked on the door frame */}
                <text x="134" y="128" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="6" fill="#efe8da" opacity="0.7">
                  IN
                </text>
                <g stroke="#efe8da" strokeWidth="1.4" opacity="0.8">
                  {Array.from({ length: dailyVault.gotIn }, (_, i) => (
                    <line key={i} x1={124 + i * 3.5} y1="132" x2={124 + i * 3.5} y2="144" />
                  ))}
                </g>
              </g>
            }
            front={
              <g aria-label={`Tonight's pot ${dailyVault.pot} tUSDC`}>
                {/* Chalkboard A-frame on the pavement */}
                <path d="M282,224 L290,166 M330,224 L322,166" stroke="#5a4630" strokeWidth="3" />
                <rect x="281" y="156" width="50" height="58" rx="3" fill="#1b2420" stroke="#5a4630" strokeWidth="3" />
                <g transform="rotate(-3 306 185)">
                  <text x="306" y="170" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" letterSpacing="0.3" fill="#efe8da" opacity="0.85">
                    TONIGHT&apos;S POT
                  </text>
                  <text x="306" y="188" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="13" fill="#f0d48f">
                    ${dailyVault.pot}
                  </text>
                  <path d="M291,192 q7,-2 15,0 t15,0" stroke="#efe8da" strokeWidth="0.8" fill="none" opacity="0.5" />
                  <text x="306" y="200" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" fill="#efe8da" opacity="0.75">
                    tUSDC
                  </text>
                  <text x="306" y="207" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="3.8" fill="#efe8da" opacity="0.55">
                    testnet
                  </text>
                </g>
              </g>
            }
          />
        </SceneLife>

        <Chatter lines={ticker} className="absolute left-3 top-[17%] w-[58%] max-w-[260px] sm:left-[10%]" />
        <div className="absolute right-3 top-14 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-chalk/80 backdrop-blur">
          {dailyVault.livePlayers} in the queue · {dailyVault.attempts.toLocaleString("en-US")} tried
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      {/* The bouncer speaks: the call to play */}
      <section className="relative z-10 mx-auto -mt-6 max-w-xl px-4">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">BIG SAM</span>
            <span className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
              Daily #{today.number} · {today.twist.name}
            </span>
          </div>
          <div className="mt-3 flex rounded-full bg-black/30 p-1 text-xs">
            {(
              [
                ["open", "Open"],
                ["cracked", "Cracked"],
                ["imminent", "Last call"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPhase(id)}
                className={`flex-1 rounded-full py-1.5 ${phase === id ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">{phase === "cracked" ? "Splitting now" : "Tonight's pot"}</div>
              <Money amount={dailyVault.pot} className="text-2xl text-brass" />
            </div>
            <div className={phase === "imminent" ? "text-right" : "sm:hidden"}>
              <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">Reset</div>
              <Countdown className={phase === "imminent" ? "text-xl text-chalk" : "text-chalk/70"} />
            </div>
          </div>
          <p className="mt-3 font-sign text-xl leading-tight sm:text-2xl">{phaseCopy[phase].line}</p>
          <a
            href="/frames/play"
            className="mt-5 block rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
          >
            Join the queue
          </a>
          <p className="mt-3 text-center text-sm text-chalk/60">{phaseCopy[phase].note}</p>
          {phase !== "imminent" && (
            <p className="mt-1 text-center text-sm text-chalk/60">
              Doors reset in <Countdown className="text-chalk" />
            </p>
          )}
          <p className="mt-2 text-center text-sm">
            <Link href="/frames/reveal" className="text-chalk/70 underline decoration-white/20">
              Last night&apos;s door
            </Link>
          </p>
          <div className="mt-3 flex justify-center sm:hidden">
            <NetworkTag className="text-chalk/70" />
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-5xl gap-8 px-4 lg:grid-cols-2">
      {/* Other doors on the street */}
      <section>
        <h2 className="font-sign text-lg">Down the street</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {otherDoors.map((d) => (
            <Link key={d.name} href={d.href} className="w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-night-2">
              <MiniDoor tone={d.tone} locked={!!d.lock} />
              <div className="p-3">
                <div className="font-sign text-sm leading-tight">{d.name}</div>
                <div className="mt-0.5 text-xs text-chalk/60">{d.kind}</div>
                <div className={`mt-2 font-mono text-[10px] uppercase tracking-wider ${d.lock ? "text-chalk/40" : "text-chalk"}`}>
                  {d.lock ? `Needs ${d.lock}` : "Walk in"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Wristbands = rank */}
      <section>
        <h2 className="font-sign text-lg">Your wristband</h2>
        <div className="mt-3 space-y-2">
          {wristbands.map((w) => (
            <Link
              key={w.name}
              href={w.href}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${w.here ? "border-chalk/40 bg-night-2" : "border-white/10"}`}
            >
              <span className="h-3.5 w-10 rounded-sm" style={{ background: w.color, boxShadow: w.here ? `0 0 12px ${w.color}` : undefined }} />
              <div className="flex-1">
                <div className="font-sign text-sm">{w.name}</div>
                <div className="text-xs text-chalk/60">{w.line}</div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/60">{w.here ? "On your wrist" : "Preview"}</span>
            </Link>
          ))}
        </div>
      </section>
      </div>

      <footer className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 font-mono text-[11px] text-chalk/50">
        <span>
          <span className="text-uv-glow">●</span> Tonight&apos;s ledger committed before the door opened · {verdict.commitment}
        </span>
        <DemoBadge />
      </footer>
      <FrameNav current="home" />
    </main>
  );
}

function MiniDoor({ tone, locked }: { tone: string; locked: boolean }) {
  return (
    <svg viewBox="0 0 160 100" className="block w-full bg-[#1a1424]" aria-hidden>
      <rect y="84" width="160" height="16" fill="#120e18" />
      <rect x="56" y="22" width="48" height="62" rx="2" fill="#0a0810" stroke={tone} strokeWidth="2" />
      <rect x="58" y="24" width="44" height="58" fill={tone} opacity="0.25" />
      <rect x="48" y="8" width="64" height="10" rx="2" fill="none" stroke={tone} strokeWidth="1.5" />
      {/* bouncer silhouette */}
      <g transform="translate(80 86) scale(.32)" fill="#07050a">
        <circle cx="0" cy="-150" r="18" />
        <path d="M-50,-60 Q-48,-118 -22,-126 L22,-126 Q48,-118 50,-60 L46,0 L-46,0 Z" />
      </g>
      {locked && (
        <g transform="translate(128 60)">
          <rect x="-8" y="-4" width="16" height="12" rx="2" fill="#6e6875" />
          <path d="M-5,-4 V-8 A5,5 0 0 1 5,-8 V-4" stroke="#6e6875" strokeWidth="2" fill="none" />
        </g>
      )}
    </svg>
  );
}
