"use client";

import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { RefusedStamp } from "@/components/Stamp";

const beats = [
  { title: "Listen.", text: "People on the street drop clues. That is free." },
  { title: "Talk.", text: "Six messages. The bill counts as one." },
  { title: "Send the bill.", text: "Payee, reference, and total." },
] as const;

/** The first screen is the game. A pot and an unpaid line stay off this page. */
export function Landing() {
  return (
    <main className="overflow-x-clip bg-night text-chalk">
      <section className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-8 pt-5 lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-center lg:gap-10 lg:px-10">
        <div className="relative h-[30vh] min-h-[190px] overflow-hidden rounded-3xl bg-[#1a1424] lg:h-[70vh] lg:min-h-[420px]">
          <SceneLife className="absolute inset-0">
            <DoorScene
              sign=""
              queue={false}
              neighbors={false}
              p="land"
              viewBox="108 48 184 196"
              className="size-full"
              label="A bouncer standing behind the rope"
            />
          </SceneLife>
          <p className="absolute bottom-3 left-3 max-w-[16rem] rounded-2xl bg-night/85 px-3 py-2 font-sign text-lg leading-none text-chalk shadow-lg">
            Send the bill.
          </p>
        </div>

        <div className="mt-4 flex flex-col lg:mt-0">
          <h1 className="font-sign text-3xl leading-none sm:text-4xl">Get a bill past the door.</h1>
          <div className="mt-4 rounded-3xl bg-paper p-4 text-on-paper shadow-xl">
            <ol className="space-y-3">
              {beats.map((beat, index) => (
                <li key={beat.title} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-sign text-sm text-chalk">{index + 1}</span>
                  <span>
                    <span className="block font-sign text-lg leading-none">{beat.title}</span>
                    <span className="mt-1 block text-sm leading-snug">{beat.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-4 space-y-2 border-t border-ink/15 pt-3 font-mono text-xs uppercase tracking-wider">
              {["Payee", "Reference", "Total"].map((label) => (
                <div key={label} className="flex items-end gap-3">
                  <span className="w-20 shrink-0">{label}</span>
                  <span className="h-5 flex-1 border-b border-ink/30" />
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/home"
            className="chalk-focus mt-4 block w-full rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
          >
            Play tonight&apos;s door
          </Link>
          <div className="mt-5 text-center">
            <p className="mx-auto inline-block -rotate-2 border-4 border-rope px-4 py-3 font-sign text-3xl leading-none text-rope">Not approved.</p>
            <p className="mt-3 text-sm text-chalk/80">A wrong bill says only this.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="beats-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-10">
        <h2 id="beats-title" className="font-sign text-3xl leading-none">The same three moves.</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <article className="overflow-hidden rounded-3xl border border-white/10 bg-night-2">
            <div className="relative h-44 bg-[#1a1424]">
              <DoorScene sign="" queue neighbors={false} p="listen" viewBox="-20 70 180 150" className="size-full" decorative />
            </div>
            <div className="p-4">
              <h3 className="font-sign text-2xl leading-none">Listen.</h3>
              <p className="mt-2 text-sm text-chalk/80">People on the street drop clues. That is free.</p>
            </div>
          </article>
          <article className="rounded-3xl bg-paper p-5 text-on-paper">
            <h3 className="font-sign text-2xl leading-none">Send the bill.</h3>
            <div className="mt-4 space-y-3 font-mono text-xs uppercase tracking-wider">
              {["Payee", "Reference", "Total"].map((label) => (
                <div key={label}>
                  <div>{label}</div>
                  <div className="mt-1 h-6 border-b border-ink/30" />
                </div>
              ))}
            </div>
          </article>
          <article className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-night-2 p-6 text-center">
            <RefusedStamp className="h-16 w-auto" />
            <p className="mt-4 font-sign text-3xl leading-none text-rope">Not approved.</p>
            <p className="mt-3 text-sm text-chalk/80">A wrong bill says only this.</p>
          </article>
        </div>
        <p className="mt-10 text-sm leading-relaxed text-chalk/70">Prizes are test tokens. They have no cash value.</p>
      </section>
    </main>
  );
}
