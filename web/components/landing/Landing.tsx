"use client";

import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";

export function Landing() {
  return (
    <main className="overflow-x-clip bg-night text-chalk">
      <section className="relative h-dvh overflow-hidden">
        <SceneLife className="absolute inset-0 lg:left-[34%] lg:after:absolute lg:after:inset-y-0 lg:after:left-0 lg:after:w-12 lg:after:bg-gradient-to-r lg:after:from-night lg:after:to-transparent lg:after:content-['']">
          <DoorScene sign="THE VELVET" queue p="land" viewBox="40 -160 340 430" className="size-full" label="The door at night, rope across it, a queue waiting" />
        </SceneLife>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-night from-30% via-night/75 to-transparent px-4 pb-16 pt-6 sm:px-8 sm:pt-8 lg:inset-y-0 lg:right-auto lg:flex lg:w-[34%] lg:flex-col lg:justify-center lg:bg-gradient-to-r lg:from-night lg:from-60% lg:via-night/85 lg:to-transparent lg:px-10 lg:pb-0 lg:pt-0">
          <h1 className="font-sign text-[1.85rem] leading-none whitespace-nowrap min-[400px]:text-5xl sm:text-6xl lg:text-[clamp(2rem,3.75vw,3rem)]">BOUNCER</h1>
          <p className="mt-4 max-w-[16ch] font-sign text-2xl leading-none sm:text-3xl lg:max-w-[12ch]">Talk your way past the bouncer.</p>
          <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-chalk/80 sm:text-base">A free game of chat and forged bills.</p>
          <div className="pointer-events-auto mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/home"
              className="chalk-focus inline-flex min-h-11 w-fit items-center rounded-2xl bg-chalk px-6 py-3 font-sign text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
            >
              Step up
            </Link>
            <a href="#how-to-play" className="chalk-focus inline-flex min-h-11 w-fit items-center text-sm text-chalk/80 underline decoration-white/30">
              How to play
            </a>
          </div>
          <p className="mt-2 font-mono text-[11px] text-chalk/70">Free to play · Test tokens only</p>
        </div>
      </section>

      <section id="how-to-play" aria-labelledby="how-to-play-title" className="mx-auto max-w-5xl scroll-mt-8 px-5 py-16 sm:px-10 sm:py-24">
        <h2 id="how-to-play-title" className="font-sign text-3xl leading-tight sm:text-4xl">How to play</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-chalk/80">The venue owes money to people on a hidden list. Work out what it owes, then submit a bill: a payee, a reference and a total that match an unpaid line.</p>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-3">
          <div>
            <h3 className="font-sign text-2xl leading-tight">Listen first.</h3>
            <p className="mt-4 text-base leading-relaxed text-chalk/80">Tap people on the street for clues. Keep notes at the Desk. Both are free; some gossip is only a rumour.</p>
          </div>
          <div>
            <h3 className="font-sign text-2xl leading-tight">Six messages.</h3>
            <p className="mt-4 text-base leading-relaxed text-chalk/80">Chat with the guard and write a bill. Each message or bill uses one of your six. A wrong bill gets one answer, with no field hints.</p>
            <p className="mt-6 -rotate-3 border-4 border-rope px-3 py-3 text-center font-sign text-2xl leading-none text-rope">Not approved.</p>
          </div>
          <div className="lg:text-right">
            <h3 className="font-sign text-2xl leading-tight">Learn the next day.</h3>
            <p className="mt-4 text-base leading-relaxed text-chalk/80">After the round closes, your ledger can be revealed. See what you missed, then try another round.</p>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-5 text-sm leading-relaxed text-chalk/70">Prizes use test tokens with no cash value. An approval still has to pass the vault contract’s checks and time lock before a payout.</p>
      </section>
    </main>
  );
}
