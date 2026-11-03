"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { cutSoFar, streak } from "@/lib/demo/raider";

type Night = "guest" | "player" | "broken";

const copy: Record<Night, { title: string; body: string }> = {
  guest: {
    title: "You got in. The night isn't saved yet.",
    body: "A guest win is held for 7 days. A passkey keeps the streak. No seed phrase.",
  },
  player: {
    title: "Streak kept. The cut is signed.",
    body: `Day ${streak.days} holds. The pot splits at reset. Claim when the lock opens.`,
  },
  broken: {
    title: "The rope stayed up.",
    body: "The streak pauses at zero. Notes from the desk stay. Tomorrow is a new list.",
  },
};

export default function AfterFrame() {
  const [night, setNight] = useState<Night>("guest");

  useEffect(() => {
    const end = new URLSearchParams(window.location.search).get("end");
    if (end === "in") setNight("player");
    if (end === "out") setNight("broken");
  }, []);

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <div className="flex rounded-full bg-night-2 p-1 text-sm">
          {(["guest", "player", "broken"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setNight(id)}
              className={`flex-1 rounded-full py-1.5 capitalize ${night === id ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
            >
              {id}
            </button>
          ))}
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">After the raid</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">{copy[night].title}</h1>
        <p className="mt-3 text-chalk/70">{copy[night].body}</p>

        {night !== "broken" ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-night-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Held until reset</div>
            <Money amount={cutSoFar} className="mt-1 text-3xl text-brass" />
            <p className="mt-2 text-sm text-chalk/60">
              Doors reset in <Countdown className="text-chalk" />
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-rope/40 bg-night-2 p-5">
            <div className="font-sign text-xl">Streak · 0</div>
            <p className="mt-2 text-sm text-chalk/65">Best is still {streak.best}. Practice does not pay and does not count.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {night === "broken" ? (
            <>
              <Link href="/frames/share?out=1" className="rounded-2xl border border-chalk/30 py-3.5 text-center text-sm">
                Share the night you missed
              </Link>
              <Link href="/frames/practice" className="rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
                Practice room
              </Link>
            </>
          ) : (
            <>
              <Link href="/frames/passkey?next=claim" className="rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
                {night === "guest" ? "Save it with a passkey" : "Claim at reset"}
              </Link>
              <Link href="/frames/share" className="rounded-2xl border border-chalk/30 py-3.5 text-center text-sm">
                Share your stamp
              </Link>
            </>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="after" />
    </main>
  );
}
