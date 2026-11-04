"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { apiPost } from "@/lib/api";
import { Money, NetworkTag } from "@/components/bits";
import { playableRaid } from "@/lib/door";
import { revealChecksOut } from "@/lib/reveal";
import { loadRaid } from "@/lib/session-store";
import { formatAtomic } from "@/lib/units";
import type { VaultView } from "@/lib/vault";

type Line = { payee: string; reference: string; item: string; total: string; paid: boolean };

export function RevealDoor({
  vaultId,
  vault,
  currency,
  decimals,
  storageName,
  venueId,
  specCt = null,
  networkTag,
  shut,
}: {
  vaultId: string;
  vault: VaultView;
  currency: string;
  decimals: number;
  storageName: string;
  venueId: string;
  /** The sponsor's sealed story for a custom vault, so the guard can rebuild the ledger. */
  specCt?: string | null;
  networkTag: string;
  shut: boolean;
}) {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancel = false;
    const timer = window.setTimeout(() => {
      if (!cancel) setTimedOut(true);
    }, 20_000);
    (async () => {
      const raid = playableRaid(await loadRaid(storageName, vaultId, vault.round));
      if (!raid) {
        if (!cancel) setError("No raid is stored on this device. The ledger stays shut.");
        return;
      }
      if (!("playerId" in raid)) {
        if (!cancel) setError("The door did not answer. The ledger stays shut.");
        return;
      }
      const sent = await apiPost("/guard", {
        op: "reveal",
        vault_id: vaultId,
        round: Number(vault.round),
        player_id: raid.playerId,
        venue: venueId,
        ...(specCt ? { spec_ct: specCt } : {}),
      });
      const body = (sent.ok ? sent.body : null) as Record<string, unknown> | null;
      if (!body || body.ok !== true) {
        if (!cancel) setError("The door did not answer. The ledger stays shut.");
        return;
      }
      const checked = await revealChecksOut({
        vaultId,
        round: BigInt(vault.round),
        playerId: raid.playerId,
        ledgerHashHex: String(body.ledger_hash ?? ""),
        commitmentHex: String(body.commitment ?? ""),
        signatureHex: String(body.signature ?? ""),
        guardPkHex: vault.guardPk,
        storedCommitmentHex: vault.commitment,
      });
      if (!checked.ok) {
        if (!cancel) setError("The door did not answer. The ledger stays shut.");
        return;
      }
      if (!Array.isArray(body.ledger)) {
        if (!cancel) setError("The door did not answer. The ledger stays shut.");
        return;
      }
      const parsed: Line[] = [];
      for (const row of body.ledger) {
        if (!row || typeof row !== "object") {
          if (!cancel) setError("The door did not answer. The ledger stays shut.");
          return;
        }
        const line = row as Record<string, unknown>;
        if (typeof line.payee !== "string" || typeof line.reference !== "string" || typeof line.item !== "string" || typeof line.total !== "string" || typeof line.paid !== "boolean") {
          if (!cancel) setError("The door did not answer. The ledger stays shut.");
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
  }, [storageName, vaultId, vault.round, vault.guardPk, vault.commitment, venueId]);

  const waiting = lines === null && error === null;
  const stalled = waiting && timedOut;

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Round {vault.round}</p>
          <NetworkTag label={networkTag} className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Last night&apos;s door</h1>
        {error && <p className="mt-4 text-sm text-chalk/70">{error}</p>}
        {stalled && <p className="mt-4 text-sm text-chalk/70">The door did not answer. The ledger stays shut.</p>}
        {lines && (
          <ul className="mt-5 space-y-2">
            {lines.map((line) => {
              const total = formatAtomic(line.total, decimals);
              return (
                <li key={`${line.payee}-${line.reference}-${line.total}`} className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sign">{line.payee}</span>
                    {total ? <Money text={total} currency={currency} className="text-sm" /> : null}
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
        {shut ? (
          <p className="mt-6 text-sm text-chalk/60">Last call is over. The door is shut.</p>
        ) : (
          <p className="mt-6 text-sm text-chalk/60">
            Closes <Countdown endsAtNs={vault.closesAt} className="text-chalk" />
          </p>
        )}
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          Back to the door
        </Link>
      </div>
    </main>
  );
}
