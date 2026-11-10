"use client";

import gsap from "gsap";
import { Suspense, use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { readLastShare, writeLastShare } from "@/lib/last-share";
import type { TokenRead } from "@/lib/page-vault";
import { shareText, squares, type Square } from "@/lib/share-text";
import { formatAtomic } from "@/lib/units";
import { setSound, sfx } from "@/lib/sfx";
import { readSoundPref } from "@/lib/sound-pref";

/**
 * The cut has landed. A PAID stamp comes down, the amount counts up, and the player can share it and go to
 * another door. The amount is shared only here, once it is paid.
 */
export function PaidMoment(props: { token: Promise<TokenRead>; atomic: string; sign: string; guard: string | null; vaultId: string; storageName: string; doorHref: string; revealHref: string }) {
  return (
    <Suspense fallback={null}>
      <Paid {...props} />
    </Suspense>
  );
}

function Paid({ token, atomic, sign, guard, vaultId, storageName, doorHref, revealHref }: { token: Promise<TokenRead>; atomic: string; sign: string; guard: string | null; vaultId: string; storageName: string; doorHref: string; revealHref: string }) {
  const read = use(token);
  const ref = useRef<HTMLDivElement>(null);
  const shown = read.ok ? formatAtomic(atomic, read.decimals) : null;
  const amount = shown && read.ok ? `${shown} ${read.symbol}` : null;
  const [grid, setGrid] = useState<Square[]>(["approved"]);
  const [streak, setStreak] = useState(0);
  // The stored night is read before it is written over, so the squares from the raid survive.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const last = readLastShare(storageName);
    if (last && last.vaultId === vaultId) {
      setGrid(last.grid);
      setStreak(last.streak);
    }
    setLoaded(true);
  }, [storageName, vaultId]);

  // The player pressed Claim on this page, so the browser lets the sound play when the payment lands.
  useEffect(() => {
    if (readSoundPref() !== "on") return;
    setSound(true);
    sfx.paid();
  }, []);

  useEffect(() => {
    if (!amount || !loaded) return;
    writeLastShare(storageName, { kind: "paid", sign, guard, grid, streak, amount, vaultId, budget: Math.max(6, grid.length), at: Date.now() });
  }, [amount, loaded, grid, streak, sign, guard, vaultId, storageName]);

  useLayoutEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(".paid-stamp", { scale: 2.4, rotation: -30, opacity: 0 }, { scale: 1, rotation: -8, opacity: 1, duration: 0.32, ease: "power4.in" })
        .fromTo(ref.current, { x: 0 }, { keyframes: { x: [-5, 4, -2, 0] }, duration: 0.24 })
        .from(".paid-rest", { y: 12, opacity: 0, duration: 0.35, stagger: 0.08 }, "-=0.05");
      const counter = ref.current?.querySelector(".paid-count");
      const target = shown ? Number(shown) : NaN;
      if (counter && Number.isFinite(target)) {
        const places = shown?.split(".")[1]?.length ?? 0;
        const state = { value: 0 };
        gsap.to(state, { value: target, duration: 1.2, ease: "power2.out", delay: 0.3, onUpdate: () => { counter.textContent = state.value.toFixed(places); } });
      }
    }, ref);
    return () => ctx.revert();
  }, [shown]);

  const text = amount ? shareText({ kind: "paid", sign, guard, grid, streak, amount }, Math.max(6, grid.length)) : null;
  return (
    <section ref={ref} className="mt-6 rounded-3xl border border-brass/40 bg-night-2 p-5 text-center">
      <svg viewBox="0 0 160 60" width="160" height="60" role="img" aria-label="Paid" className="paid-stamp mx-auto">
        <g transform="rotate(-6 80 30)">
          <rect x="4" y="4" width="152" height="52" rx="6" fill="none" stroke="#4fd18b" strokeWidth="4" />
          <text x="80" y="42" textAnchor="middle" fill="#4fd18b" fontFamily="var(--font-bungee)" fontSize="30" letterSpacing="3">PAID</text>
        </g>
      </svg>
      {shown && read.ok ? (
        <p className="paid-rest mt-3 font-sign text-4xl text-brass">
          <span className="paid-count tabular-nums">{shown}</span> <span className="text-lg">{read.symbol}</span>
        </p>
      ) : null}
      <p className="paid-rest mt-2 text-sm text-chalk/80">{guard ? `${guard} let you in, and the vault paid.` : "You got in, and the vault paid."} It is in your account now.</p>
      <p className="paid-rest mt-2 text-lg tracking-widest" aria-hidden>{squares(grid)}</p>
      <div className="paid-rest mt-4 flex flex-col gap-3">
        {text ? <ShareButton text={text} url={doorHref} label="Share your cut" className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]" /> : null}
        <a href="/home" className="rounded-2xl border border-chalk/30 py-3 text-sm">Try another door</a>
        <a href={revealHref} className="text-sm text-chalk/70 underline decoration-white/20">See the ledger when the round closes</a>
      </div>
    </section>
  );
}
