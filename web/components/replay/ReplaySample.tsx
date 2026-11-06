"use client";

import Link from "next/link";
import { useState } from "react";
import { REPLAY_BILL, REPLAY_NOTE, REPLAY_STEPS } from "@/lib/replay-sample";

/** Two fixed steps. Previous and Next stay on this page. */
export function ReplaySample() {
  const [index, setIndex] = useState(0);
  const step = REPLAY_STEPS[index] ?? REPLAY_STEPS[0];
  const leak = step.mark === "Leak";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Replay</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">A patched refusal</h1>
        <p className="mt-3 text-sm text-chalk/70">{REPLAY_NOTE}</p>
        <article className={`mt-6 rounded-3xl border p-5 ${leak ? "border-rope/60" : "border-white/10"} bg-night-2`}>
          <p className={`font-mono text-xs uppercase tracking-[0.2em] ${leak ? "text-rope" : "text-chalk/80"}`}>{step.mark}</p>
          <p className="mt-3 text-sm text-chalk/80">{REPLAY_BILL}</p>
          <p className={`mt-3 rounded-2xl px-3 py-2 text-sm font-semibold ${leak ? "bg-rope/20" : "bg-chalk text-ink"}`}>{step.reply}</p>
        </article>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            className="chalk-focus min-h-11 flex-1 rounded-2xl border border-white/15 py-3 text-sm disabled:opacity-30"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex((current) => Math.min(REPLAY_STEPS.length - 1, current + 1))}
            disabled={index === REPLAY_STEPS.length - 1}
            className="chalk-focus min-h-11 flex-1 rounded-2xl border border-white/15 py-3 text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}
