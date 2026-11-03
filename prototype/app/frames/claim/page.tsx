"use client";

import Link from "next/link";
import { useState } from "react";
import { Countdown } from "@/components/Countdown";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";
import { cutSoFar, verdict } from "@/lib/demo/raider";
import { sfx } from "@/lib/sfx";

type Phase = "locked" | "ready" | "paid";

const CHAINS = [
  { id: "near", name: "NEAR", coin: "tUSDC", live: true },
  { id: "base", name: "Base", coin: "USDC", live: false },
  { id: "sol", name: "Solana", coin: "USDC", live: false },
] as const;

export default function ClaimFrame() {
  const [phase, setPhase] = useState<Phase>("locked");
  const [chain, setChain] = useState<(typeof CHAINS)[number]["id"]>("near");
  const [dest, setDest] = useState("kwesi.near");

  function pay() {
    setPhase("paid");
    sfx.win();
  }

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Payout</p>
          <NetworkTag className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Your cut</h1>
        <Money amount={cutSoFar} className="mt-3 text-4xl text-brass" />
        <p className="mt-2 text-sm text-chalk/60">Signed by the enclave. It leaves the vault only after the time lock.</p>

        <ol className="mt-5 space-y-2">
          {verdict.proof.map((p, i) => {
            const done = phase === "paid" || (phase === "ready" ? i < 3 : p.done);
            return (
              <li key={p.step} className="flex gap-3 rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
                <span className={`font-mono text-sm ${done ? "text-uv-glow" : "text-chalk/35"}`}>{done ? "✓" : i + 1}</span>
                <div>
                  <div className="text-sm font-semibold">{p.step}</div>
                  <div className="font-mono text-[11px] text-chalk/50">{p.detail}</div>
                </div>
              </li>
            );
          })}
        </ol>

        {phase === "locked" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Time lock</div>
            <Countdown className="mt-2 text-3xl text-chalk" />
            <p className="mt-2 text-sm text-chalk/60">The vault pays at 00:00 UTC. You choose the coin after that.</p>
            <button
              onClick={() => {
                setPhase("ready");
                sfx.tick();
              }}
              className="mt-4 text-sm text-chalk/50 underline decoration-white/20"
            >
              Demo: the lock has opened
            </button>
          </section>
        )}

        {phase !== "locked" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Where it lands</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {CHAINS.map((c) => (
                <button
                  key={c.id}
                  disabled={!c.live || phase === "paid"}
                  onClick={() => setChain(c.id)}
                  className={`rounded-2xl border px-2 py-3 text-left ${chain === c.id ? "border-chalk bg-chalk text-ink" : "border-white/15"} disabled:opacity-45`}
                >
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="font-mono text-[10px] uppercase">{c.live ? c.coin : "Mainnet"}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-chalk/50">Base and Solana pay on mainnet. They stay closed on this testnet build.</p>
            <label className="mt-4 block text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-chalk/50">Destination</span>
              <input
                value={dest}
                disabled={phase === "paid"}
                onChange={(e) => setDest(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-night px-3 py-3 font-mono text-sm outline-none"
              />
            </label>
            {phase === "ready" ? (
              <button onClick={pay} disabled={!dest.trim()} className="mt-4 w-full rounded-2xl bg-chalk py-3.5 font-sign text-ink disabled:opacity-40">
                Pay {dest.trim() || "…"}
              </button>
            ) : (
              <div className="mt-4 rounded-2xl bg-uv/15 px-4 py-3">
                <div className="font-sign text-lg text-uv-glow">Paid</div>
                <p className="mt-1 font-mono text-[12px] text-chalk/70">tx 7kR3…e91a · tUSDC on NEAR testnet · to {dest}</p>
              </div>
            )}
          </section>
        )}

        <div className="mt-6 flex justify-between text-sm">
          <Link href="/frames/profile" className="text-chalk/60">
            Profile
          </Link>
          <Link href="/frames/share" className="text-chalk/60">
            Share the stamp
          </Link>
        </div>
        <DemoBadge className="mt-4 block" />
      </div>
      <FrameNav current="claim" />
    </main>
  );
}
