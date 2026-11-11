"use client";

import { useEffect, useState } from "react";
import { raidHistoryHref, raidHistoryRow, type RaidHistoryRow } from "@/lib/raid-history";
import { loadRaid } from "@/lib/session-store";
import { readHold } from "@/lib/player-hold";
import { loadPlayerSession } from "@/lib/player-session";

/** What this browser already did at this door tonight. Nothing is drawn for a newcomer. */
export function TonightRaid({ storageName, vaultId, round, playHref, budget, onDone }: { storageName: string; vaultId: string; round: string; playHref: string; budget?: number; onDone?: (done: boolean) => void }) {
  const [row, setRow] = useState<RaidHistoryRow | null>(null);
  const [spent, setSpent] = useState(false);

  useEffect(() => {
    let live = true;
    loadRaid(storageName, vaultId, round).then((found) => {
      if (!live || !found || "error" in found) return;
      const next = raidHistoryRow(`${vaultId}:${round}`, found);
      const used = budget !== undefined && budget > 0 && Math.max(found.used ?? 0, found.outcomes?.length ?? 0) >= budget;
      setRow(next);
      setSpent(used);
      if (next) onDone?.(next.state === "in" || (used && next.state !== "held" && next.state !== "stuck"));
    }).catch(() => undefined);
    return () => { live = false; };
  }, [storageName, vaultId, round, budget, onDone]);

  if (!row || row.state === "shut") return null;
  const copy = row.state === "in"
    ? { line: "You got in tonight.", link: "Your cut", href: raidHistoryHref(row) }
    : row.state === "stuck"
      ? { line: "Your bill was approved, but this browser cannot send it to the vault.", link: "Why", href: raidHistoryHref(row) }
    : row.state === "held"
      ? { line: "Your bill was approved. The vault has not recorded it yet.", link: "Send it again", href: raidHistoryHref(row) }
      : spent
        ? { line: "You were turned away tonight. Every message is used.", link: "See how it ended", href: playHref }
        : { line: "Your raid tonight is still open on this browser.", link: "Back to your raid", href: playHref };
  return (
    <p role="status" className="mt-4 rounded-2xl border border-uv/40 bg-uv/10 px-4 py-3 text-sm">
      {copy.line}{" "}
      <a href={copy.href} className="chalk-focus inline-flex min-h-11 items-center font-semibold underline decoration-white/30">{copy.link}</a>
    </p>
  );
}

/** The signed-in player's name and streak, read only when this browser already holds a sign-in. */
export function SignedInLine() {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void readHold().then((held) => {
      if (!held || !live) return;
      held.fill(0);
      loadPlayerSession().then((result) => {
        if (!live || !result.ok) return;
        const { name, streak } = result.session.player;
        setLine(`Signed in as ${name}${streak > 0 ? ` · ${streak}-day streak` : ""}`);
      }).catch(() => undefined);
    });
    return () => { live = false; };
  }, []);
  if (!line) return null;
  return <p className="mt-3 text-center text-sm text-chalk/80">{line}</p>;
}
