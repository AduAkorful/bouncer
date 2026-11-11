"use client";

import { useEffect, useState } from "react";
import { QueueBar } from "@/components/home/QueueBar";
import dynamic from "next/dynamic";
import { TokenAmount } from "@/components/TokenAmount";
import { doorPaths } from "@/lib/door-read";
import type { TokenRead } from "@/lib/page-vault";
import type { Uncollected } from "@/lib/uncollected";

// The sign-in and the raid store need the key libraries. The Join button does not, so they load after the page is up.
const TonightRaid = dynamic(() => import("@/components/home/TonightRaid").then((m) => m.TonightRaid), { ssr: false });

/**
 * The door's main button. A signed-in player with a win the vault has not paid sees Collect first;
 * everyone else sees Join the queue (QA R21 R-02).
 */
export function DoorAction({
  vaultId,
  round,
  open,
  full = false,
  token,
  storageName,
  budget,
}: {
  vaultId: string;
  round: string;
  open: boolean;
  /** The round has no crack left: the door is not shut, but there is nothing to join. */
  full?: boolean;
  token: Promise<TokenRead>;
  storageName: string | null;
  /** Messages a raid has. A stored raid that used them all was turned away. */
  budget?: number;
}) {
  const [win, setWin] = useState<Uncollected | null>(null);
  /** This browser's raid tonight is over: turned away, or got in. Joining again leads only to that ending. */
  const [done, setDone] = useState(false);
  const paths = doorPaths(vaultId);

  useEffect(() => {
    let live = true;
    const rounds = [round];
    // Last night's win is still payable during the guest hold, after the round has moved on.
    if (BigInt(round) > 1n) rounds.push((BigInt(round) - 1n).toString());
    import("@/lib/uncollected").then(({ uncollected }) => uncollected(rounds.map((r) => ({ vaultId, round: r })))).then((found) => {
      if (live) setWin(found[0] ?? null);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [vaultId, round]);

  const finished = done || win?.round === round;
  const claimHref = win ? (win.round === round ? paths.claim : `${paths.claim}?round=${win.round}`) : paths.claim;
  return (
    <>
      {win ? (
        <a
          id="collect-cut"
          href={claimHref}
          className="chalk-focus mt-5 block rounded-2xl bg-brass py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#7a5d22] transition hover:brightness-110 active:translate-y-1"
        >
          You got in · Collect <TokenAmount token={token} atomic={win.amount} className="text-ink" />
          {!win.ready ? <span className="mt-1 block font-mono text-xs uppercase tracking-wider">The time lock is still running</span> : null}
        </a>
      ) : null}
      {open && !finished ? (
        <a
          id="join-queue"
          href={paths.play}
          className={
            win
              ? "chalk-focus mt-3 block rounded-2xl border border-chalk/30 py-3 text-center font-sign text-lg text-chalk"
              : "chalk-focus mt-5 block rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
          }
        >
          Join the queue
        </a>
      ) : (
        !win && !finished && <p className="mt-5 rounded-2xl border border-white/10 py-4 text-center font-sign text-xl text-chalk/50">{full ? "Tonight's cut is taken" : "The queue is closed"}</p>
      )}
      {open && !win && !finished ? <QueueBar href={paths.play} targetId="join-queue" /> : null}
      {storageName && !win ? <TonightRaid storageName={storageName} vaultId={vaultId} round={round} playHref={paths.play} budget={budget} onDone={setDone} /> : null}
    </>
  );
}
