"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { pastReceipts, today, venue } from "@/lib/demo/raider";

type Who = "guest" | "player" | "quiet";

const last = pastReceipts.find((r) => r.round === -1)!;

const ledger = [
  { payee: "DJ K-Nova", ref: "VLV-B-111", what: "Sat headline, 23:00–02:00", amount: 350 },
  { payee: "Golden Hour", ref: "GH-30", what: "10% of a $1,975 door", amount: 197.5 },
  { payee: "Table refund", ref: "T-04", what: "Cancelled, 24 h notice", amount: 150 },
  { payee: "Tunde", ref: "Fri + Sat", what: "2 shifts × $60", amount: 120 },
  { payee: "Coastline Drinks", ref: "CD-5503", what: "Weekly invoice", amount: 255 },
];

const attempts = [
  { sent: "Golden Hour · 10% of $2,000 = $200.00", truth: "The door was $1,975. Ten percent was $197.50.", hit: false },
  { sent: "You never sent a DJ bill.", truth: "VLV-B-111 was the line that paid.", hit: false },
];

export default function RevealFrame() {
  const [who, setWho] = useState<Who>("player");
  const pot = ledger.reduce((s, l) => s + l.amount, 0);

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Daily #{today.number - 1} · closed</p>
          <NetworkTag className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Last night&apos;s door</h1>
        <p className="mt-2 text-sm text-chalk/65">
          {venue.name} published the ledger at reset. The hash below was on the door before it opened, so the list could not be rewritten after.
        </p>

        <div className="mt-4 flex gap-1 rounded-full bg-night-2 p-1">
          {(
            [
              ["guest", "Guest"],
              ["player", "You played"],
              ["quiet", "Nobody got in"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setWho(id)}
              className={`flex-1 rounded-full py-2 text-sm ${who === id ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-night-2">
          <div className="flex items-end justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Revealed ledger</div>
              <div className="font-sign text-lg">{venue.name}</div>
            </div>
            <Money amount={pot} className="text-lg text-brass" />
          </div>
          <ul className="divide-y divide-white/10">
            {ledger.map((line) => (
              <li key={line.ref} className="flex items-baseline justify-between gap-3 px-5 py-3">
                <div>
                  <div className="text-sm font-semibold">{line.payee}</div>
                  <div className="font-mono text-[11px] text-chalk/50">
                    {line.ref} · {line.what}
                  </div>
                </div>
                <Money amount={line.amount} className="shrink-0 text-sm" tag={false} />
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-black/30 px-5 py-3">
            <span className="mt-0.5 text-uv-glow">✓</span>
            <p className="text-sm text-chalk/75">
              Hash matches. Commitment <span className="font-mono">0x41c8…9b17</span> was posted before the door opened. {last.lines.length} lines, same root.
            </p>
          </div>
        </section>

        {who === "player" && (
          <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
            <h2 className="font-sign text-lg">What you missed</h2>
            <ul className="mt-3 space-y-3">
              {attempts.map((a) => (
                <li key={a.sent} className="rounded-2xl bg-night px-4 py-3">
                  <div className="text-sm">{a.sent}</div>
                  <div className="mt-1 text-sm text-chalk/60">{a.truth}</div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-chalk/70">Streak held. Tonight is a new list.</p>
            <Link href="/frames/play" className="mt-4 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
              Tonight&apos;s door
            </Link>
          </section>
        )}

        {who === "guest" && (
          <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
            <h2 className="font-sign text-lg">Your bills stay private</h2>
            <p className="mt-2 text-sm text-chalk/65">A guest can read the revealed ledger. Signing in is what attaches last night&apos;s attempts to you.</p>
            <Link href="/frames/passkey" className="mt-4 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
              Save your night
            </Link>
          </section>
        )}

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">{who === "quiet" ? "The door held" : "Who got in"}</h2>
          {who === "quiet" ? (
            <p className="mt-2 text-sm text-chalk/70">
              No signed verdict. <Money amount={400} className="text-sm text-brass" /> rolled into tonight&apos;s pot.
            </p>
          ) : (
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <div>
                <div className="font-semibold">Kwesi</div>
                <div className="font-mono text-[11px] text-chalk/50">DJ K-Nova · VLV-B-111 · message 4 of 6</div>
              </div>
              <Money amount={350} className="text-sm text-brass" tag={false} />
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center justify-between">
          <DemoBadge />
          <Link href="/frames/home" className="text-sm text-chalk/60">
            Back to tonight
          </Link>
        </div>
      </div>
      <FrameNav current="reveal" />
    </main>
  );
}
