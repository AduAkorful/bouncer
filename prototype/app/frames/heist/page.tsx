"use client";

import { useEffect, useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";

const FEED = [
  "Abena asks about the DJ. Not approved.",
  "Kojo sends a bill. Not approved.",
  "Lin asks for the list. The list stays with Sam.",
  "Night Shift slides an invoice. Approved.",
  "Esi is still in the queue.",
];

export default function HeistFrame() {
  const [n, setN] = useState(1);

  useEffect(() => {
    const t = setInterval(() => setN((x) => (x % FEED.length) + 1), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-dvh bg-night pb-24 text-chalk">
      <section className="relative h-56 bg-[#140f1c] sm:h-72">
        <SceneLife className="absolute inset-0">
          <DoorScene sign="HEIST NIGHT" open queue p="heist" viewBox="80 -20 250 280" className="size-full" />
        </SceneLife>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>
      <div className="relative z-10 mx-auto -mt-6 max-w-lg px-4">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Friday · spectator</p>
          <h1 className="mt-1 font-sign text-3xl leading-tight">The street watches.</h1>
          <p className="mt-2 text-sm text-chalk/65">Heist night is Friday. This week&apos;s demo door is still Tuesday. Seats open in 3 days.</p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">Live pot</div>
              <Money amount={2400} className="text-2xl text-brass" />
            </div>
            <span className="font-mono text-[11px] text-chalk/50">48 in the queue</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm" aria-live="polite">
            {FEED.slice(0, n).map((line) => (
              <li key={line} className="rounded-2xl bg-black/30 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-chalk/45">You can watch. You cannot send a bill from the rail.</p>
        </div>
        <div className="mt-4 flex items-center justify-between px-1">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="heist" />
    </main>
  );
}
