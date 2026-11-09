"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { RULES } from "@/lib/rules";

const beats = RULES;

/** The bouncer fills the first screen. On a phone the bill sits on the picture. No pot and no unpaid line. */
export function Landing({ live = null }: { live?: ReactNode }) {
  return (
    <main className="overflow-x-clip bg-night text-chalk">
      <section className="relative min-h-dvh short:grid short:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        {/* Phones: the scene owns the top of the screen and its neon sign is the title. Desktop keeps the side-by-side poster. */}
        <div className="absolute inset-x-0 top-0 h-[44dvh] min-h-[250px] md:h-[50dvh] short:sticky short:inset-auto short:top-0 short:h-dvh short:min-h-0 lg:relative lg:inset-auto lg:h-auto lg:min-h-dvh">
          <SceneLife className="absolute inset-0 bg-[#120d18]">
            <DoorScene
              sign="BOUNCER"
              queue={false}
              neighbors={false}
              p="land"
              viewBox="96 10 208 214"
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-night short:hidden lg:hidden" />
          <p className="absolute bottom-16 left-8 hidden rounded-2xl bg-night/85 px-3 py-2 font-sign text-lg leading-none text-chalk shadow-lg lg:block">
            Send the bill.
          </p>
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-5 pt-[max(44dvh,250px)] short:min-h-0 short:px-6 short:pb-4 short:pt-4 sm:px-8 md:items-center md:pt-[max(50dvh,250px)] short:items-start lg:items-start lg:justify-center lg:px-12 lg:py-10">
          <h1 className="max-lg:sr-only font-sign text-5xl leading-[0.8] text-chalk drop-shadow-[0_3px_0_rgb(0_0_0/0.7)] sm:text-7xl xl:text-8xl">BOUNCER</h1>
          <p className="max-w-sm text-lg leading-snug md:text-center lg:text-left lg:mt-3 text-chalk/90 drop-shadow-[0_2px_0_rgb(0_0_0/0.8)]">Get a bill past the door.</p>
          <div className="mt-4 h-1 w-14 bg-rope" />

          <div className="mt-auto w-full max-w-md short:mt-3 lg:mt-6">
            <div id="how-to-play" tabIndex={-1} className="scroll-mt-6 bg-chalk px-5 py-4 short:py-2.5 text-ink shadow-[8px_8px_0_#b3243a] outline-none">
              <h2 className="sr-only">How to play</h2>
              <ol className="space-y-3 short:space-y-1">
                {beats.map((beat, index) => (
                  <li key={beat.title} className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-3">
                    <span className="font-sign text-lg leading-none text-rope">{index + 1}</span>
                    <span>
                      <span className="block font-sign text-lg leading-none">{beat.title}</span>
                      <span className="mt-1 block text-sm leading-snug short:hidden">{beat.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {/* A printed sample, not a form: dotted rules and sample values so nobody tries to type in it. */}
              <div aria-hidden="true" className="mt-4 hidden space-y-1.5 border-t border-ink/15 pt-3 font-mono lg:block text-xs uppercase tracking-wider text-ink/80">
                {[["Payee", "Who is owed"], ["Reference", "Their invoice no."], ["Total", "The exact amount"]].map(([label, sample]) => (
                  <div key={label} className="flex items-baseline gap-3">
                    <span className="w-20 shrink-0">{label}</span>
                    <span className="flex-1 border-b border-dotted border-ink/30 normal-case tracking-normal italic">{sample}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/home"
              className="chalk-focus mt-4 block w-full border-2 short:mt-3 short:py-3 border-transparent bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_0_#9c9483] active:translate-y-1 active:bg-[#e6dfcf] active:shadow-[0_2px_0_#9c9483] forced-colors:border-[ButtonText]"
            >
              Play tonight&apos;s door
            </Link>
            {live}
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
