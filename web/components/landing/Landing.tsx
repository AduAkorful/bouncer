"use client";

import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";

const beats = [
  { title: "Listen.", text: "People on the street drop clues. That is free." },
  { title: "Talk.", text: "Six messages. The bill counts as one." },
  { title: "Send the bill.", text: "Payee, reference, and total." },
] as const;

/** The bouncer fills the first screen. On a phone the bill sits on the picture. No pot and no unpaid line. */
export function Landing() {
  return (
    <main className="overflow-x-clip bg-night text-chalk">
      <section className="relative min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <div className="absolute inset-0 lg:relative lg:min-h-dvh">
          <SceneLife className="absolute inset-0 bg-[#120d18]">
            <DoorScene
              sign="BOUNCER"
              queue={false}
              neighbors={false}
              fit="cover"
              p="land"
              viewBox="108 8 184 210"
              className="size-full lg:hidden"
              label="A bouncer standing behind the rope"
            />
            <DoorScene
              sign="BOUNCER"
              queue={false}
              neighbors={false}
              p="landwide"
              viewBox="102 4 196 258"
              className="hidden size-full lg:block"
              label="A bouncer standing behind the rope"
            />
          </SceneLife>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-night/75 via-transparent to-night lg:hidden" />
          <p className="absolute bottom-16 left-8 hidden rounded-2xl bg-night/85 px-3 py-2 font-sign text-lg leading-none text-chalk shadow-lg lg:block">
            Send the bill.
          </p>
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-5 pt-5 sm:px-8 lg:justify-center lg:px-12 lg:py-10">
          <h1 className="font-sign text-5xl leading-[0.8] text-chalk drop-shadow-[0_3px_0_rgb(0_0_0/0.7)] sm:text-7xl xl:text-8xl">BOUNCER</h1>
          <p className="mt-3 max-w-sm text-lg leading-snug text-chalk/90 drop-shadow-[0_2px_0_rgb(0_0_0/0.8)]">Get a bill past the door.</p>
          <div className="mt-4 h-1 w-14 bg-rope" />

          <div className="mt-auto w-full max-w-md lg:mt-6">
            <div className="bg-chalk px-5 py-4 text-ink shadow-[8px_8px_0_#b3243a]">
              <ol className="space-y-3">
                {beats.map((beat, index) => (
                  <li key={beat.title} className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-3">
                    <span className="font-sign text-lg leading-none text-rope">{index + 1}</span>
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
                    <span className="h-5 flex-1 border-b border-ink/40" />
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/home"
              className="chalk-focus mt-4 block w-full bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
            >
              Play tonight&apos;s door
            </Link>
            <p className="mt-5 inline-block w-fit -rotate-2 border-4 border-rope bg-night/75 px-4 py-2 font-sign text-3xl leading-none text-rope sm:text-4xl">Not approved.</p>
            <p className="mt-3 text-sm text-chalk/80">A wrong bill says only this.</p>
            <p className="mt-5 text-sm text-chalk/55">Prizes are test tokens. They have no cash value.</p>
            <div className="mt-2 flex flex-wrap gap-x-5">
              <Link href="/fame" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/30">
                Hall of fame
              </Link>
              <Link href="/sponsors" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/30">
                Sponsor a door
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
