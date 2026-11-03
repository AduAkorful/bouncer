"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoBadge, FrameNav } from "@/components/bits";
import { streak } from "@/lib/demo/raider";
import { sfx } from "@/lib/sfx";

type Step = "create" | "signing" | "done";

export default function PasskeyFrame() {
  const [step, setStep] = useState<Step>("create");
  const [next, setNext] = useState<"claim" | "profile">("profile");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("next") === "claim") setNext("claim");
  }, []);

  function create() {
    setStep("signing");
    sfx.tick();
    window.setTimeout(() => {
      setStep("done");
      sfx.clink();
    }, 1100);
  }

  return (
    <main className="flex min-h-dvh items-end bg-night px-4 pb-24 pt-10 text-chalk sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-night-2 p-6 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Account</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">{step === "done" ? "Saved." : "Save your streak"}</h1>

        {step === "create" && (
          <>
            <p className="mt-3 text-sm text-chalk/70">
              One passkey on this phone. No seed phrase, no password. NEAR creates the account while you hold the sensor. Your {streak.days}-day streak and your case notes stay with it.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-chalk/80">
              <li>🔥 {streak.days}-day streak, best {streak.best}</li>
              <li>Notes from tonight&apos;s door</li>
              <li>A claim, if the verdict pays</li>
            </ul>
            <button onClick={create} className="mt-6 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_5px_0_#9c9483]">
              Create passkey
            </button>
          </>
        )}

        {step === "signing" && (
          <div className="mt-8 mb-6 text-center">
            <div className="mx-auto size-16 animate-pulse rounded-full border-2 border-uv" />
            <p className="mt-4 font-sign text-xl">Signing in</p>
            <p className="mt-1 text-sm text-chalk/60">Confirm it on this device.</p>
          </div>
        )}

        {step === "done" && (
          <>
            <p className="mt-3 text-sm text-chalk/70">
              kwesi.near is this phone. The streak is {streak.days}. Nothing here can be written down and stolen later: there is no phrase to save.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={next === "claim" ? "/frames/claim" : "/frames/profile"}
                className="rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink"
              >
                {next === "claim" ? "Claim the payout" : "Open your profile"}
              </Link>
              <Link href="/frames/share" className="rounded-2xl border border-chalk/30 py-3 text-center text-sm">
                Share the stamp
              </Link>
            </div>
          </>
        )}
        <DemoBadge className="mt-5 block" />
      </div>
      <FrameNav current="passkey" />
    </main>
  );
}
