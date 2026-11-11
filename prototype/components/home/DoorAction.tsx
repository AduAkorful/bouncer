"use client";

import { QueueBar } from "@/components/home/QueueBar";
import { TokenAmount } from "@/components/TokenAmount";
import { doorPaths } from "@/lib/door-read";
import type { TokenRead } from "@/lib/page-vault";

/** The door's action. A stored win is the main button, and the queue stays a link until then. */
export function DoorAction({
  vaultId,
  open,
  full = false,
  token,
  win = null,
  banner = null,
  showJoinBar = false,
}: {
  vaultId?: string;
  round: string;
  open: boolean;
  full?: boolean;
  token: Promise<TokenRead>;
  win?: { amount: string; ready: boolean; href: string } | null;
  banner?: { line: string; link: string; href: string } | null;
  showJoinBar?: boolean;
}) {
  const paths = doorPaths(vaultId);
  const claimHref = win?.href ?? paths.claim;
  return (
    <>
      {win ? (
        <a id="collect-cut" href={claimHref} className="chalk-focus mt-5 flex min-h-14 w-full flex-col items-center justify-center rounded-2xl bg-brass px-4 py-3 text-center font-sign text-lg leading-tight text-ink">
          <span>You got in · Collect <TokenAmount token={token} atomic={win.amount} className="text-ink" /></span>
          {win.ready ? null : <span className="font-mono text-[11px] uppercase tracking-wider">The time lock is still running</span>}
        </a>
      ) : null}
      {open ? (
        <a
          id="join-queue"
          href={paths.play}
          className={`chalk-focus mt-5 block w-full rounded-2xl py-4 text-center font-sign text-xl shadow-[0_6px_0_#9c9483] transition hover:bg-white active:translate-y-1 active:shadow-[0_2px_0_#9c9483] ${win ? "border border-chalk/30 bg-transparent text-chalk shadow-none" : "bg-chalk text-ink"}`}
        >
          Join the queue
        </a>
      ) : win ? null : (
        <p className="mt-5 rounded-2xl border border-white/10 py-4 text-center font-sign text-xl text-chalk/50">{full ? "Tonight's cut is taken" : "The queue is closed"}</p>
      )}
      {open && !win ? <QueueBar href={paths.play} targetId="join-queue" force={showJoinBar} /> : null}
      {banner && !win ? (
        <p role="status" className="mt-4 rounded-2xl border border-uv/40 bg-uv/10 px-4 py-3 text-sm">
          {banner.line}{" "}
          <a href={banner.href} className="chalk-focus font-sign underline decoration-white/20">{banner.link}</a>
        </p>
      ) : null}
    </>
  );
}
