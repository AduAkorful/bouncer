"use client";

import { SiteNav } from "@/components/SiteNav";
import Link from "next/link";
import type { ReactNode } from "react";
import { TryAgain } from "@/components/TryAgain";

export function Blocked({
  title,
  detail,
  href = "/home",
  retryHref,
  kicker = "Unavailable",
  door,
  children,
}: {
  title: string;
  detail: string;
  href?: string;
  retryHref?: string;
  kicker?: string;
  /** The door's sign, so a closed page says which door it is. */
  door?: string;
  /** Below the card, such as the doors that are open instead. */
  children?: ReactNode;
}) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-night-2 p-6">
        {door ? <p className="mb-3 font-sign text-xl leading-none text-chalk/90">{door}</p> : null}
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">{kicker}</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">{title}</h1>
        <p className="mt-3 text-sm text-chalk/70">{detail}</p>
        {retryHref ? (
          <div className="mt-4">
            <TryAgain href={retryHref} />
          </div>
        ) : null}
        <Link href={href} className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          Back to the door
        </Link>
      </div>
      {children ? <div className="mx-auto max-w-lg [&>section]:px-0">{children}</div> : null}
    </main>
  );
}
