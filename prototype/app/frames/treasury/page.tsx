"use client";

import { useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { CREW_BILL, HISTORY, crew, splitFor } from "@/lib/demo/crew";
import { sfx } from "@/lib/sfx";

const ACCOUNT = "night-shift.sputnik.testnet";

export default function TreasuryFrame() {
  const [copied, setCopied] = useState(false);
  const split = splitFor(CREW_BILL.total);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ACCOUNT);
      setCopied(true);
      sfx.tick();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Crew treasury</p>
        <h1 className="mt-1 font-sign text-3xl">Night Shift</h1>
        <p className="mt-2 text-sm text-chalk/65">Every transfer is a proposal on the council account. The standing split is 40 / 30 / 30.</p>

        <button onClick={copy} className="mt-5 w-full rounded-2xl border border-white/10 bg-night-2 px-4 py-4 text-left">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/45">Sputnik DAO · testnet</div>
          <div className="mt-1 break-all font-mono text-sm">{ACCOUNT}</div>
          <div className="mt-2 text-xs text-chalk/55">{copied ? "Copied" : "Copy the account"}</div>
        </button>

        <div className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Balance</div>
          <Money amount={0} className="mt-1 text-3xl text-brass" />
          <p className="mt-2 text-sm text-chalk/60">Tonight&apos;s {CREW_BILL.total} already left in three transfers.</p>
        </div>

        <h2 className="mt-8 font-sign text-lg">Standing split</h2>
        <ul className="mt-3 space-y-2">
          {split.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>
                <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: m.colour }} />
                {m.name}
                <span className="ml-2 font-mono text-[10px] uppercase text-chalk/45">{m.role}</span>
              </span>
              <Money amount={m.amount} className="text-sm" />
            </li>
          ))}
        </ul>

        <h2 className="mt-8 font-sign text-lg">History</h2>
        <ul className="mt-3 space-y-2">
          {HISTORY.map((h) => (
            <li key={h.what} className="rounded-2xl border border-white/10 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">{h.when}</div>
              <div className="mt-1 text-sm font-semibold">{h.what}</div>
              <div className="text-sm text-chalk/60">{h.detail}</div>
            </li>
          ))}
          <li className="rounded-2xl border border-white/10 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">Tonight</div>
            <div className="mt-1 text-sm font-semibold">Proposal #1 executed 3/3</div>
            <div className="text-sm text-chalk/60">DJ K-Nova crack paid out to the standing split.</div>
          </li>
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="treasury" />
    </main>
  );
}
