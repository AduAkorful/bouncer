"use client";

import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";

export function Landing() {
  return (
    <main className="overflow-x-clip bg-night text-chalk">
      <section className="relative h-dvh overflow-hidden">
        <SceneLife className="absolute inset-0">
          <DoorScene sign="THE VELVET" queue p="land" viewBox="40 -160 340 430" className="size-full" label="The door at night, rope across it, a queue waiting" />
        </SceneLife>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-night from-30% via-night/75 to-transparent px-4 pb-24 pt-6 sm:px-8 sm:pt-8 lg:inset-y-0 lg:right-auto lg:flex lg:w-[min(30rem,40vw)] lg:flex-col lg:justify-center lg:bg-gradient-to-r lg:from-night lg:from-60% lg:via-night/85 lg:to-transparent lg:px-10 lg:pb-0 lg:pt-0">
          <h1 className="font-sign text-[1.85rem] leading-none whitespace-nowrap min-[400px]:text-5xl sm:text-6xl lg:text-[3rem]">BOUNCER</h1>
          <p className="mt-4 max-w-[16ch] font-sign text-2xl leading-none sm:text-3xl lg:max-w-[12ch]">Talk your way past the bouncer.</p>
          <Link
            href="/home"
            className="pointer-events-auto mt-6 inline-block w-fit rounded-2xl bg-chalk px-6 py-3 font-sign text-ink shadow-[0_6px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
          >
            Step up
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl items-center gap-14 px-5 py-24 sm:px-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
        <div>
          <h2 className="font-sign text-4xl leading-none">Six messages.</h2>
          <p className="mt-4 max-w-[28ch] text-base text-chalk/75">Talk on the street for nothing. A message to the door, and the bill you hand over, each spend one.</p>
        </div>
        <p className="-rotate-6 border-4 border-rope px-5 py-4 text-center font-sign text-4xl leading-none text-rope sm:px-8 sm:text-5xl">Not approved.</p>
        <div className="lg:text-right">
          <h2 className="font-sign text-4xl leading-none">Morning.</h2>
          <p className="mt-4 max-w-[28ch] text-base text-chalk/75 lg:ml-auto">The ledger opens. You see the line you missed. He never says which part of the bill failed.</p>
        </div>
      </section>
    </main>
  );
}
