"use client";

import { useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { sfx } from "@/lib/sfx";

const STEPS = ["Story", "Claimants", "Fairness", "Fund", "Tickets", "Launch"] as const;

export default function SponsorFrame() {
  const [step, setStep] = useState(0);
  const [story, setStory] = useState("Friday pitch night. The unpaid invoices are the ones the sponsors already approved.");
  const [kinds, setKinds] = useState("DJ deposit, poster printer, venue hire");
  const [fair, setFair] = useState(false);
  const [pot, setPot] = useState("500");
  const [rule, setRule] = useState("Split equally among whoever gets in");
  const [tickets, setTickets] = useState("40");
  const live = step === STEPS.length - 1;

  function next() {
    if (step === 2 && !fair) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    sfx.tick();
  }

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Venue builder · H1</p>
        <h1 className="mt-1 font-sign text-3xl">Sponsor a door.</h1>
        <ol className="mt-4 flex gap-1">
          {STEPS.map((name, i) => (
            <li key={name} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-chalk" : "bg-white/10"}`} title={name} />
          ))}
        </ol>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
          {step + 1} · {STEPS[step]}
        </p>

        {step === 0 && (
          <label className="mt-4 block">
            <span className="text-sm text-chalk/70">The story the bouncer is guarding</span>
            <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-white/10 bg-night-2 p-3 text-sm outline-none" />
          </label>
        )}
        {step === 1 && (
          <label className="mt-4 block">
            <span className="text-sm text-chalk/70">Claimant types. You edit the draft; you do not publish the unpaid lines.</span>
            <textarea value={kinds} onChange={(e) => setKinds(e.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-white/10 bg-night-2 p-3 text-sm outline-none" />
          </label>
        )}
        {step === 2 && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="text-sm text-chalk/75">A fair door pays real bills and refuses guesses. This check is the sponsor&apos;s word, stored with the launch.</p>
            <button
              onClick={() => {
                setFair(true);
                sfx.pop();
              }}
              className={`mt-4 w-full rounded-2xl py-3 font-sign ${fair ? "bg-uv text-chalk" : "bg-chalk text-ink"}`}
            >
              {fair ? "Fairness checked" : "Mark it fair"}
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-chalk/70">
              Pot (tUSDC)
              <input value={pot} onChange={(e) => setPot(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-night-2 px-3 py-3 font-mono outline-none" />
            </label>
            <label className="block text-sm text-chalk/70">
              Payout rule
              <input value={rule} onChange={(e) => setRule(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-night-2 px-3 py-3 outline-none" />
            </label>
          </div>
        )}
        {step === 4 && (
          <label className="mt-4 block text-sm text-chalk/70">
            Tickets for the night
            <input value={tickets} onChange={(e) => setTickets(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-night-2 px-3 py-3 font-mono outline-none" />
          </label>
        )}
        {live && (
          <div className="mt-4 rounded-3xl border border-brass/40 bg-night-2 p-5">
            <div className="font-sign text-xl">Door is up.</div>
            <p className="mt-2 text-sm text-chalk/70">{story}</p>
            <p className="mt-2 text-sm text-chalk/60">{kinds}</p>
            <div className="mt-3 flex items-end justify-between">
              <Money amount={Number(pot) || 0} className="text-2xl text-brass" />
              <span className="font-mono text-[11px] text-chalk/50">{tickets} tickets</span>
            </div>
            <p className="mt-2 text-xs text-chalk/50">{rule}</p>
          </div>
        )}

        {!live && (
          <button onClick={next} disabled={step === 2 && !fair} className="mt-5 w-full rounded-2xl bg-chalk py-3.5 font-sign text-ink disabled:opacity-40">
            Continue
          </button>
        )}
        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="sponsor" />
    </main>
  );
}
