"use client";

import Link from "next/link";
import { CloseTime, Countdown } from "@/components/Countdown";
import { TokenAmount } from "@/components/TokenAmount";
import type { TokenRead } from "@/lib/page-vault";

/** Tonight's front door on the landing: what is in the pot and how long is left. */
export function LiveDoor({ sign, href, dayPot, closesAt, token }: { sign: string; href: string; dayPot: string; closesAt: string; token: Promise<TokenRead> }) {
  return (
    <Link href={href} className="chalk-focus mt-4 block rounded-2xl border border-white/15 bg-night/80 px-4 py-3 transition hover:border-white/30">
      <span className="block font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Open tonight</span>
      <span className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-sign text-lg leading-tight">{sign}</span>
        <TokenAmount token={token} atomic={dayPot} className="text-xl text-brass" />
      </span>
      <span className="mt-1 block text-sm text-chalk/80">
        Closes in <Countdown endsAtNs={closesAt} className="text-chalk" /> <CloseTime endsAtNs={closesAt} className="text-chalk/60" />
      </span>
    </Link>
  );
}
