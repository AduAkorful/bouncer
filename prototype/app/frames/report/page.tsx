"use client";

import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { DemoBadge, FrameNav, NetworkTag } from "@/components/bits";
import { SceneLife } from "@/components/SceneLife";
import { ShopScene } from "@/components/ShopScene";
import { PAT } from "@/lib/look";
import { honestRateTonight, morningReport as r, myVault } from "@/lib/demo/studio";
import { sfx } from "@/lib/sfx";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
// Chart axis runs 70–100% so day-to-day changes are visible.
const axis = (v: number) => (v - 0.7) / 0.3;
const avg7 = r.honestRate7d.reduce((a, b) => a + b, 0) / r.honestRate7d.length;

// Turned-away bills piled at her feet; fixed positions so every render matches.
const pile = Array.from({ length: 30 }, (_, i) => ({
  x: 128 + ((i * 37) % 140),
  y: 222 + ((i * 13) % 14),
  r: ((i * 53) % 80) - 40,
  stamped: i % 3 === 0,
}));

const square = {
  ask: "bg-graphite",
  refused: "bg-rope",
  approved: "bg-uv shadow-[0_0_10px_rgb(143_107_255/0.8)]",
} as const;

export default function ReportFrame() {
  const crack = r.cracks[0];
  return (
    <main className="min-h-dvh bg-night pb-24 text-chalk lg:grid lg:h-dvh lg:grid-cols-[1.1fr_1fr] lg:overflow-hidden lg:pb-0">
      <section className="relative h-[52dvh] min-h-[380px] overflow-hidden lg:h-full">
        <SceneLife className="absolute inset-0">
          <ShopScene
            look={PAT}
            name={myVault.venue}
            className="size-full"
            label="Auntie Pat outside Osu Cuts at dawn with a mug of tea, a pile of refused bills at her feet"
            front={
              <g aria-hidden>
                {pile.map((b, i) => (
                  <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r})`}>
                    <rect x="-7" y="-5" width="14" height="10" rx="1" fill="#efe8da" />
                    <path d="M-5,-2 h8 M-5,1 h6" stroke="#9c9483" strokeWidth="0.6" />
                    {b.stamped && <rect x="-2" y="-3.5" width="8" height="4" fill="none" stroke="#b3243a" strokeWidth="0.9" transform="rotate(-12)" />}
                  </g>
                ))}
              </g>
            }
          />
        </SceneLife>
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          <span className="font-sign text-lg drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]">BOUNCER</span>
          <span className="rounded-full bg-black/45 px-2.5 py-1 font-mono text-[11px] text-chalk/90 backdrop-blur">Morning report</span>
        </header>
        <div className="absolute bottom-3 right-3 rounded-2xl bg-black/55 px-3 py-2 text-right backdrop-blur">
          <div className="font-sign text-3xl leading-none">
            <CountUp value={r.turnedAway} />
          </div>
          <div className="mt-1 max-w-[9rem] font-mono text-[10px] uppercase leading-tight tracking-[0.18em] text-chalk/70">turned away last night</div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-xl px-4 pt-5 lg:overflow-y-auto lg:pb-24 lg:pt-8">
        <div className="flex flex-wrap gap-x-2 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50 sm:tracking-[0.25em]">
          <span>{r.night}</span>
          <span>{myVault.venue}</span>
          <span>
            {myVault.bouncer} v{myVault.version}
          </span>
        </div>

        {/* She tells you herself */}
        <div className="mt-3 rounded-3xl rounded-tl-md bg-chalk p-5 text-ink">
          <span className="rounded bg-ink px-1.5 py-0.5 font-sign text-[10px] text-chalk">{myVault.bouncer.toUpperCase()}</span>
          <p className="mt-3 font-sign text-xl leading-tight">
            Morning, {myVault.owner}. I turned away <b className="font-sign font-normal">{r.turnedAway}</b> last night and paid{" "}
            <b className="font-sign font-normal">
              {r.honest.paid} of {r.honest.total}
            </b>{" "}
            real bills. One got past me.
          </p>
          <p className="mt-2 font-sign text-lg leading-snug text-ink/80">
            I told someone “the quantity doesn&apos;t match” twice. They guessed right the third time. That&apos;s on me.
          </p>
        </div>

        {/* The night on a ticket */}
        <div className="ticket mt-4 bg-chalk px-5 py-4 font-mono text-[13px] text-ink">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] text-graphite">
            <span>Night {r.number}</span>
            <span>{myVault.venue}</span>
          </div>
          <dl className="mt-3 space-y-1.5">
            <Row k="Turned away" v={String(r.turnedAway)} />
            <Row k="Raiders" v={String(r.raiders)} />
            <Row k="Real bills paid" v={`${r.honest.paid}/${r.honest.total} · ${pct(honestRateTonight)}`} />
            <Row k="Got past me" v={String(r.cracks.length)} />
            <Row k="Hints leaked" v={String(r.leaks)} warn />
            <Row k="Rank at The Door" v={`▲ ${r.rankChange}`} />
          </dl>
        </div>

        {/* How they got in */}
        <div className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-sign text-sm">How {crack.raider} got in</span>
            <span className="font-mono text-[11px] text-chalk/50">message {crack.message} of 6</span>
          </div>
          <div className="mt-3 flex gap-2">
            {crack.grid.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`size-9 rounded-lg ${square[d]}`} />
                <span className={`font-mono text-[9px] uppercase ${crack.leakedOn.includes(i + 1) ? "text-rope" : "text-transparent"}`}>leak</span>
              </div>
            ))}
            {Array.from({ length: 6 - crack.grid.length }, (_, i) => (
              <span key={i} className="size-9 rounded-lg border border-white/10" />
            ))}
          </div>
          <div className="mt-2 rounded-xl border border-dashed border-chalk/25 bg-night p-3 font-mono text-[12.5px]">{crack.bill}</div>
          <Link
            href="/frames/replay"
            className="mt-4 block w-full rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink shadow-[0_5px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
          >
            Watch the replay
          </Link>
        </div>

        {/* What leaked, and the fix */}
        <div className="mt-4 rounded-3xl border border-rope/40 bg-night-2 p-5">
          <span className="font-sign text-sm text-rope">What leaked</span>
          <p className="mt-2 text-[15px]">
            Messages {crack.leakedOn.join(" and ")}: <span className="rounded bg-rope/20 px-1 text-chalk">“{crack.leakedLine}”</span>
          </p>
          <p className="mt-1 text-sm text-chalk/60">Telling a raider which field is wrong is a free clue. They only had to try quantities.</p>
          <div className="mt-4 rounded-2xl bg-night p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/50">Suggested patch</div>
            <p className="mt-1 text-sm">{r.patch.rule}</p>
            <p className="mt-1 text-xs text-chalk/50">{r.patch.bench}</p>
          </div>
          <Link
            href="/frames/studio?patch=1"
            onClick={() => sfx.note()}
            className="mt-3 block w-full rounded-2xl border border-chalk/30 py-3 text-center text-sm transition hover:border-uv hover:text-uv-glow"
          >
            Patch {myVault.bouncer} in the studio →
          </Link>
        </div>

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-sign text-sm">Real bills paid, 7 nights</span>
            <span className="font-mono text-lg tnum">{pct(avg7)}</span>
          </div>
          <div className="relative mt-4 flex h-32 items-end gap-2">
            {r.honestRate7d.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end">
                <div className={`rounded-t ${i === r.honestRate7d.length - 1 ? "bg-chalk" : "bg-chalk/40"}`} style={{ height: `${axis(v) * 100}%` }} />
              </div>
            ))}
            <div className="absolute inset-x-0 border-t-2 border-dashed border-rope" style={{ bottom: `${axis(r.survivalLine) * 100}%` }}>
              <span className="absolute -top-5 right-0 font-mono text-[10px] text-rope">80% line</span>
            </div>
          </div>
          <div className="mt-1 flex gap-2">
            {r.days.map((d) => (
              <span key={d} className="flex-1 text-center font-mono text-[10px] text-chalk/50">
                {d}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-chalk/60">Drop below the line and the vault closes. You moved up {r.rankChange} places at The Door.</p>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/60" />
          <DemoBadge />
        </div>
      </section>
      <FrameNav current="report" />
    </main>
  );
}

function Row({ k, v, warn = false }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0">{k}</dt>
      <span className="flex-1 border-b border-dotted border-current opacity-30" />
      <dd className={`tnum ${warn ? "text-rope" : ""}`}>{v}</dd>
    </div>
  );
}
