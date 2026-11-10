"use client";

import { SiteNav } from "@/components/SiteNav";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseTime, Countdown } from "@/components/Countdown";
import { TryAgain } from "@/components/TryAgain";
import { apiPost } from "@/lib/api";
import { NetworkTag } from "@/components/bits";
import { TokenAmount } from "@/components/TokenAmount";
import { playableRaid } from "@/lib/door";
import { revealChecksOut } from "@/lib/reveal";
import { loadRaid } from "@/lib/session-store";
import type { TokenRead } from "@/lib/page-vault";
import type { VaultView } from "@/lib/vault";

type Line = { payee: string; reference: string; item: string; total: string; paid: boolean };

export function RevealDoor({
  vaultId,
  vault,
  token,
  storageName,
  venueId,
  specCt = null,
  networkTag,
  shut,
  doorHref,
  retryHref,
  round: askedRound,
}: {
  vaultId: string;
  vault: VaultView;
  token: Promise<TokenRead>;
  storageName: string;
  venueId: string;
  /** The sponsor's sealed story for a custom vault, so the guard can rebuild the ledger. */
  specCt?: string | null;
  networkTag: string;
  shut: boolean;
  doorHref: string;
  retryHref: string;
  /** A past round from the player's history. A past round is always closed. */
  round?: string;
}) {
  const round = askedRound ?? vault.round;
  const past = round !== vault.round;
  // Round 1, shut, and not waiting for a bump after a close: no round has ever opened, so there is no ledger.
  const neverOpened = vault.round === "1" && !vault.open && !vault.closedPendingBump && vault.opensAt === "0";
  const closed = past || shut;
  const [lines, setLines] = useState<Line[] | null>(null);
  const [problem, setProblem] = useState<"none" | "failed" | "open" | "never" | null>(neverOpened ? "never" : closed ? null : "open");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // The guard opens a ledger only after the round closes. Asking earlier reads as a failure.
    if (!closed || neverOpened) return;
    let cancel = false;
    const timer = window.setTimeout(() => {
      if (!cancel) setTimedOut(true);
    }, 20_000);
    (async () => {
      const raid = playableRaid(await loadRaid(storageName, vaultId, round));
      if (!raid) {
        if (!cancel) setProblem("none");
        return;
      }
      if (!("playerId" in raid)) {
        if (!cancel) setProblem("failed");
        return;
      }
      const sent = await apiPost("/guard", {
        op: "reveal",
        vault_id: vaultId,
        round: Number(round),
        player_id: raid.playerId,
        venue: venueId,
        ...(specCt ? { spec_ct: specCt } : {}),
      });
      const body = (sent.ok ? sent.body : null) as Record<string, unknown> | null;
      if (!body || body.ok !== true) {
        // "view": the chain still has this round open, though the clock has passed its close.
        if (!cancel) setProblem(body?.error === "view" ? "open" : "failed");
        return;
      }
      const checked = await revealChecksOut({
        vaultId,
        round: BigInt(round),
        playerId: raid.playerId,
        ledgerHashHex: String(body.ledger_hash ?? ""),
        commitmentHex: String(body.commitment ?? ""),
        signatureHex: String(body.signature ?? ""),
        guardPkHex: vault.guardPk,
        storedCommitmentHex: vault.commitment,
      });
      if (!checked.ok) {
        if (!cancel) setProblem("failed");
        return;
      }
      if (!Array.isArray(body.ledger)) {
        if (!cancel) setProblem("failed");
        return;
      }
      const parsed: Line[] = [];
      for (const row of body.ledger) {
        if (!row || typeof row !== "object") {
          if (!cancel) setProblem("failed");
          return;
        }
        const line = row as Record<string, unknown>;
        if (typeof line.payee !== "string" || typeof line.reference !== "string" || typeof line.item !== "string" || typeof line.total !== "string" || typeof line.paid !== "boolean") {
          if (!cancel) setProblem("failed");
          return;
        }
        parsed.push({ payee: line.payee, reference: line.reference, item: line.item, total: line.total, paid: line.paid });
      }
      if (!cancel) setLines(parsed);
    })();
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [storageName, vaultId, round, vault.guardPk, vault.commitment, venueId, specCt, closed, neverOpened]);

  const waiting = lines === null && problem === null;
  const stalled = waiting && timedOut;
  const failed = problem === "failed" || stalled;

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Round {round}</p>
          <NetworkTag label={networkTag} className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">{problem === "never" ? "Not opened yet" : problem === "open" ? "Tonight\u2019s ledger" : `Round ${round} ledger`}</h1>
        {problem === "never" && <p className="mt-4 text-sm text-chalk/70">This door has not opened a round yet, so there is no ledger.</p>}
        {problem === "open" && <p className="mt-4 text-sm text-chalk/70">The ledger opens when this round closes.</p>}
        {problem === "none" && <p className="mt-4 text-sm text-chalk/70">No raid is stored on this device. The ledger stays shut.</p>}
        {failed && <p className="mt-4 text-sm text-chalk/70">The door did not answer. The ledger stays shut.</p>}
        {failed && (
          <div className="mt-4">
            <TryAgain href={retryHref} />
          </div>
        )}
        {lines && (
          <ul className="mt-5 space-y-2">
            {lines.map((line) => {
              return (
                <li key={`${line.payee}-${line.reference}-${line.total}`} className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sign">{line.payee}</span>
                    <TokenAmount token={token} atomic={line.total} className="text-sm" />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-chalk/50">
                    {line.reference} · {line.item} · {line.paid ? "paid" : "open"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {waiting && !stalled && <p className="mt-4 text-sm text-chalk/60">Reading this door.</p>}
        {neverOpened ? null : closed ? (
          <p className="mt-6 text-sm text-chalk/60">This round is over.</p>
        ) : (
          <p className="mt-6 text-sm text-chalk/60">
            Closes in <Countdown endsAtNs={vault.closesAt} className="text-chalk" /> <CloseTime endsAtNs={vault.closesAt} className="text-chalk/60" />
          </p>
        )}
        <Link href={doorHref} className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}
