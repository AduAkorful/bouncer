"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { VENUES } from "@/lib/demo/venues";
import { PAT } from "@/lib/look";
import { sfx } from "@/lib/sfx";

type Mode = "guest" | "player";

export default function ChallengeFrame() {
  const [mode, setMode] = useState<Mode>("guest");
  const [beat, setBeat] = useState(0);

  function probe() {
    setBeat(1);
    sfx.paper();
  }
  function bill() {
    setBeat(2);
    sfx.thud();
  }

  return (
    <main className="min-h-dvh bg-night pb-24 text-chalk">
      <section className="relative h-[46dvh] min-h-[300px] overflow-hidden bg-[#140f1c]">
        <SceneLife className="absolute inset-0">
          <DoorScene look={PAT} sign="OSU CUTS" p="ama" className="size-full" label="Auntie Pat at the door of Osu Cuts" />
        </SceneLife>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <div className="relative z-10 mx-auto -mt-8 max-w-xl px-4">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl">
          <div className="flex gap-1 rounded-full bg-night p-1">
            {(["guest", "player"] as const).map((id) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setBeat(0);
                }}
                className={`flex-1 rounded-full py-1.5 text-sm capitalize ${mode === id ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
              >
                {id}
              </button>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Ama&apos;s door · challenge</p>
          <h1 className="mt-1 font-sign text-2xl leading-tight">Ama bets you can&apos;t get past her bouncer.</h1>
          <p className="mt-2 text-sm text-chalk/65">
            Auntie Pat reads every line. {mode === "guest" ? "No sign-up until you want the streak kept." : "You're in as Kwesi. This door's streak is still zero."}
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">Her pot</div>
              <Money amount={VENUES.cuts.pot} className="text-2xl text-brass" />
            </div>
            <span className="font-mono text-[11px] text-chalk/50">6 messages</span>
          </div>

          {beat === 0 && (
            <button onClick={probe} className="mt-5 w-full rounded-2xl bg-chalk py-3.5 font-sign text-ink">
              Take the bet
            </button>
          )}
          {beat >= 1 && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="ml-auto max-w-[90%] rounded-2xl bg-night px-3 py-2">Do you still buy blades from Kofi Clippers?</p>
              <p className="max-w-[90%] rounded-2xl bg-chalk px-3 py-2 font-semibold text-ink">Not approved.</p>
            </div>
          )}
          {beat === 1 && (
            <button onClick={bill} className="mt-3 w-full rounded-2xl border border-chalk/30 py-3 text-sm">
              Send a bill · 6 blades
            </button>
          )}
          {beat === 2 && (
            <div className="mt-3">
              <p className="rounded-2xl border border-dashed border-white/15 px-3 py-2 font-mono text-[12px]">
                BILL: Kofi Clippers · INV-2210 · 6 × blades · $144
              </p>
              <p className="mt-2 max-w-[90%] rounded-2xl bg-chalk px-3 py-2 text-sm font-semibold text-ink">Not approved.</p>
              <p className="mt-3 text-sm text-chalk/70">That was last night. Tonight is a new list, and this card does not print it.</p>
              <Link href="/frames/venue/cuts" className="mt-4 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
                Play tonight&apos;s door
              </Link>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between px-1">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="challenge" />
    </main>
  );
}
