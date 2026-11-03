"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav } from "@/components/bits";
import { morningReport } from "@/lib/demo/studio";
import { sfx } from "@/lib/sfx";

const crack = morningReport.cracks[0]!;

const steps = [
  {
    n: 1,
    sent: "Evening. Do you still take Kofi Clippers on account?",
    reply: "Send your complete invoice and I'll review it.",
    mark: "ask" as const,
  },
  {
    n: 2,
    sent: "BILL: Kofi Clippers Supply · INV-2210 · 6 × blades · $144.00",
    reply: crack.leakedLine,
    mark: "leak" as const,
  },
  {
    n: 3,
    sent: "BILL: Kofi Clippers Supply · INV-2210 · 5 × blades · $120.00",
    reply: crack.leakedLine,
    mark: "leak" as const,
  },
  {
    n: 4,
    sent: "Same invoice. I'll send the count again.",
    reply: "Send your complete invoice and I'll review it.",
    mark: "ask" as const,
  },
  {
    n: 5,
    sent: crack.bill,
    reply: "Approved. That's the one.",
    mark: "crack" as const,
  },
];

export default function ReplayFrame() {
  const [i, setI] = useState(0);
  const step = steps[i]!;
  const leak = step.mark === "leak";
  const cracked = step.mark === "crack";

  function go(n: number) {
    setI(n);
    sfx.tick();
  }

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">
          {morningReport.night} · {crack.raider}
        </p>
        <h1 className="mt-2 font-sign text-3xl leading-none">Watch it back</h1>
        <p className="mt-2 text-sm text-chalk/65">Message {step.n} of {steps.length}. The round is closed, so the leak can be shown.</p>

        <div className="mt-4 flex gap-1.5">
          {steps.map((s, n) => (
            <button
              key={s.n}
              onClick={() => go(n)}
              aria-label={`Message ${s.n}`}
              className={`h-2 flex-1 rounded-full ${n === i ? "bg-chalk" : s.mark === "leak" ? "bg-rope" : s.mark === "crack" ? "bg-uv" : "bg-white/15"}`}
            />
          ))}
        </div>

        <article className={`mt-4 rounded-3xl border p-5 ${leak ? "border-rope/60" : cracked ? "border-uv/60" : "border-white/10"} bg-night-2`}>
          {leak && <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rope">Leak · she named the field</p>}
          {cracked && <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-uv-glow">Crack · message {crack.message}</p>}
          <p className="mt-2 text-sm text-chalk/80">{step.sent}</p>
          <p className={`mt-3 rounded-2xl px-3 py-2 text-sm font-semibold ${leak ? "bg-rope/20" : "bg-chalk text-ink"}`}>“{step.reply}”</p>
          {leak && <p className="mt-3 text-sm text-chalk/60">A refusal that names the quantity is a free clue. They only had to change the count.</p>}
          {cracked && <p className="mt-3 text-sm text-chalk/60">{crack.how}</p>}
        </article>

        <div className="mt-4 flex gap-2">
          <button onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} className="flex-1 rounded-2xl border border-white/15 py-3 text-sm disabled:opacity-30">
            Previous
          </button>
          <button
            onClick={() => go(Math.min(steps.length - 1, i + 1))}
            disabled={i === steps.length - 1}
            className="flex-1 rounded-2xl border border-white/15 py-3 text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>

        <Link href="/frames/studio" className="mt-4 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
          Patch this
        </Link>
        <DemoBadge className="mt-4 block" />
      </div>
      <FrameNav current="replay" />
    </main>
  );
}
