"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { FrameNav, NetworkTag } from "@/components/bits";
import { Countdown } from "@/components/Countdown";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { ApprovedStamp, RefusedStamp } from "@/components/Stamp";
import { shareGrid, streak, today, venue, verdict, type Decision } from "@/lib/demo/raider";
import { shortHash } from "@/lib/stamp";
import { sfx } from "@/lib/sfx";

const square: Record<Decision, string> = {
  ask: "bg-graphite",
  refused: "bg-rope",
  approved: "bg-uv shadow-[0_0_14px_rgb(143_107_255/0.9)]",
  none: "bg-night-3",
};
const word: Record<Decision, string> = { ask: "ask", refused: "no", approved: "in", none: "" };
const emoji: Record<Decision, string> = { ask: "⬛", refused: "🟥", approved: "🟪", none: "⬜" };
const outGrid: Decision[] = ["ask", "refused", "ask", "refused", "refused", "refused"];

export default function ShareFrame() {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [gotIn, setGotIn] = useState(true);
  const grid = gotIn ? shareGrid : outGrid;
  const text = gotIn
    ? `Bouncer #${today.number} · ${venue.name}\nGot in on message ${verdict.message}/6 🔥${streak.days}\n${shareGrid.map((d) => emoji[d]).join("")}`
    : `Bouncer #${today.number} · ${venue.name}\nNot this time · 6/6\n${outGrid.map((d) => emoji[d]).join("")}`;

  // The ticket gets stamped as it arrives: squares light in order, then the stamp comes down.
  useLayoutEffect(() => {
    const turned = new URLSearchParams(window.location.search).get("out") === "1";
    if (turned) setGotIn(false);
    // ?still skips the entrance, for capturing the card as an image.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(window.location.search).has("still")) return;
    const stampScale = turned ? 1 : window.matchMedia("(min-width: 640px)").matches ? 0.75 : 0.5;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.25 })
        .from(".ticket-card", { y: 24, opacity: 0, duration: 0.5, ease: "power3.out" })
        .from(".got-in", { opacity: 0, filter: "blur(6px)", duration: 0.5 }, "-=0.15")
        .from(".msg-sq", { scale: 0.4, opacity: 0, duration: 0.22, stagger: 0.09, ease: "back.out(2)" }, "-=0.2")
        .fromTo(
          ".hero-stamp",
          { scale: stampScale * 2.2, opacity: 0, rotate: -30 },
          { scale: stampScale, opacity: 1, rotate: turned ? -8 : -14, duration: 0.32, ease: "power4.in", onComplete: () => sfx.thud() },
          "+=0.1",
        )
        .fromTo(".ticket-card", { x: 0 }, { keyframes: { x: [-4, 3, -2, 0] }, duration: 0.22 })
        .from(".side-in", { y: 12, opacity: 0, duration: 0.35, stagger: 0.08, ease: "power2.out" }, "-=0.1");
    }, root);
    return () => ctx.revert();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      sfx.tick();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // Closing the share sheet isn't an error worth showing.
      }
    } else copy();
  }

  return (
    <main
      ref={root}
      className="min-h-dvh bg-[radial-gradient(ellipse_at_30%_0%,#21173a_0%,#08060c_55%)] px-4 pb-24 pt-8 text-chalk sm:pt-14 lg:flex lg:items-center lg:justify-center lg:pb-10"
    >
      <div className="mx-auto grid max-w-md gap-8 lg:max-w-5xl lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center lg:gap-16">
        {/* The ticket: the image that travels. No spoilers, only the shape of the night. */}
        <figure className="ticket-card relative">
          <div className="relative overflow-hidden rounded-t-[22px] bg-[#140f1d] ring-1 ring-white/10">
            <SceneLife className="relative aspect-[16/9] sm:aspect-[5/4]">
              <DoorScene sign={venue.name.toUpperCase()} open={gotIn} queue={false} p="share" viewBox="96 -24 270 216" className="absolute inset-0 size-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#140f1d] to-transparent" />
            </SceneLife>
            <div className="relative -mt-8 px-6 pb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/55">
                Bouncer · Daily #{today.number} · {today.dateLabel}
              </div>
              <div className={`got-in mt-1 font-sign-inline text-[56px] leading-[0.95] ${gotIn ? "neon-uv" : "text-chalk/70"}`}>{gotIn ? "I GOT IN" : "NOT TONIGHT"}</div>
              <div className="mt-2 text-[15px] text-chalk/80">
                {gotIn ? (
                  <>
                    Past <b className="font-semibold text-chalk">{venue.bouncer}</b> at <span className="font-sign">{venue.name}</span>
                  </>
                ) : (
                  <>
                    <b className="font-semibold text-chalk">{venue.bouncer}</b> kept the rope up
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tear line: notches and a dashed perforation */}
          <div className="relative h-0">
            <div className="absolute inset-x-6 top-0 border-t-2 border-dashed border-white/15" />
            <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[#0d0a14]" />
            <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[#0d0a14]" />
          </div>

          <div className="relative flex rounded-b-[22px] bg-[#1b1427] ring-1 ring-white/10">
            <div className="flex-1 px-6 pb-6 pt-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/55">Message {gotIn ? verdict.message : 6} of 6</span>
              <div className="mt-3 flex gap-2" role="img" aria-label={gotIn ? "Messages: ask, refused, ask, approved, two unused" : "Messages: six used, none approved"}>
                {[...grid, ...Array<Decision>(6 - grid.length).fill("none")].map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className={`msg-sq aspect-square w-full rounded-lg ${d === "none" ? "border border-white/10" : square[d]}`} />
                    <span className="font-mono text-[9px] uppercase text-chalk/45">{word[d] || "·"}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-chalk/45">
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-chalk/75">{gotIn ? `🔥 ${streak.days}-day streak` : "streak paused"}</span>
                <span>verdict {shortHash(verdict.signature)}</span>
              </div>
            </div>
            <div className="flex w-9 items-center justify-center border-l-2 border-dashed border-white/10">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-chalk/40 [writing-mode:vertical-rl]">{gotIn ? "Admit one" : "Try again"}</span>
            </div>
          </div>

          {/* Hand stamp across the tear line */}
          <div className={`hero-stamp pointer-events-none absolute right-3 origin-top-right sm:right-4 ${gotIn ? "top-[8%] -rotate-[14deg] scale-50 sm:scale-75" : "top-[46%] -rotate-6"}`}>
            {gotIn ? (
              <ApprovedStamp
                signature={verdict.signature}
                ring={`${venue.name.toUpperCase()} · DAILY #${today.number} · ${shortHash(verdict.signature).toUpperCase()} · `}
                size={124}
              />
            ) : (
              <RefusedStamp />
            )}
          </div>
        </figure>

        <section>
          <div className="side-in mb-4 flex rounded-full bg-white/5 p-1 text-sm">
            <button
              onClick={() => {
                setGotIn(true);
                gsap.set(".hero-stamp", { scale: window.matchMedia("(min-width: 640px)").matches ? 0.75 : 0.5, rotate: -14, opacity: 1 });
              }}
              className={`flex-1 rounded-full py-1.5 ${gotIn ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
            >
              Got in
            </button>
            <button
              onClick={() => {
                setGotIn(false);
                gsap.set(".hero-stamp", { scale: 1, rotate: -8, opacity: 1 });
              }}
              className={`flex-1 rounded-full py-1.5 ${gotIn ? "text-chalk/70" : "bg-chalk font-semibold text-ink"}`}
            >
              Turned away
            </button>
          </div>
          <h1 className="side-in font-sign text-3xl leading-tight sm:text-4xl">{gotIn ? "Tell them you got in." : "Tell them you tried."}</h1>
          <p className="side-in mt-2 text-chalk/65">No spoilers. Your ledger was yours alone, so the card shows only how your night went.</p>

          <div className="side-in mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={share}
              className="rounded-2xl bg-chalk py-3.5 font-sign text-ink shadow-[0_5px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
            >
              Share
            </button>
            <button onClick={copy} className={`rounded-2xl border py-3.5 text-sm transition ${copied ? "border-uv text-uv-glow" : "border-chalk/30"}`}>
              {copied ? "✓ Copied" : "Copy text"}
            </button>
          </div>

          {/* How it lands in a group chat */}
          <div className="side-in mt-6 rounded-2xl bg-[#0f1a17] p-4 ring-1 ring-white/5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/40">In the group chat</div>
            <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[#1f4d40] px-3.5 py-2.5 shadow">
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-snug">{text}</pre>
              <div className="mt-1 text-right font-mono text-[10px] text-chalk/50">23:41 ✓✓</div>
            </div>
          </div>

          <div className="side-in mt-6 flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
            <span className="text-sm text-chalk/70">New door, new list in</span>
            <Countdown className="text-lg text-chalk" />
          </div>
          <p className="side-in mt-3 text-xs text-chalk/45">
            The stamp is drawn from verdict <span className="font-mono">{shortHash(verdict.signature)}</span>, so anyone can check it&apos;s real.
          </p>
          <div className="side-in mt-4">
            <NetworkTag className="text-chalk/55" />
          </div>
        </section>
      </div>
      <FrameNav current="share" />
    </main>
  );
}
