"use client";

import { useEffect, useState } from "react";
import { doorLabel, mergeHistory, raidHistoryHref, raidHistoryLabel, type RaidHistoryRow } from "@/lib/raid-history";
import { listRaidHistory } from "@/lib/session-store";
import { subscribeNights, type ServerNight } from "@/lib/session-nights";
import { uncollected, type Uncollected } from "@/lib/uncollected";

/** One list: the raids on this browser, plus the nights the server keeps for this passkey. */
export function ProfileHistory({ storageName }: { storageName: string }) {
  const [device, setDevice] = useState<RaidHistoryRow[] | { error: string } | null>(null);
  const [server, setServer] = useState<ServerNight[]>([]);
  const [waiting, setWaiting] = useState<Uncollected[]>([]);

  useEffect(() => {
    let live = true;
    listRaidHistory(storageName).then((found) => {
      if (live) setDevice(found);
    });
    const stop = subscribeNights((nights) => {
      if (live) setServer(nights);
    });
    return () => {
      live = false;
      stop();
    };
  }, [storageName]);

  const wins = device && !("error" in device) ? mergeHistory(device, server).filter((row) => row.state === "in") : [];
  const winKey = wins.map((row) => `${row.vaultId}:${row.round}`).join(",");
  useEffect(() => {
    if (!winKey) return;
    let live = true;
    uncollected(winKey.split(",").map((key) => {
      const split = key.lastIndexOf(":");
      return { vaultId: key.slice(0, split), round: key.slice(split + 1) };
    })).then((found) => {
      if (live) setWaiting(found);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [winKey]);

  if (device === null) return <p className="mt-2 text-sm text-chalk/70">Reading this browser.</p>;
  const failed = "error" in device;
  const rows = mergeHistory(failed ? [] : device, server);
  if (rows.length === 0) {
    return <p role={failed ? "status" : undefined} className="mt-2 text-sm text-chalk/70">{failed ? "Raid history could not be read on this browser." : "No raid is recorded for you yet."}</p>;
  }
  return (
    <>
    {waiting.map((win) => (
      <a
        key={`${win.vaultId}:${win.round}`}
        href={raidHistoryHref({ vaultId: win.vaultId, round: win.round, state: "in" })}
        className="chalk-focus mt-3 block rounded-2xl bg-brass px-4 py-3 font-sign text-lg text-ink"
      >
        A cut is waiting · {doorLabel(win.vaultId)}, round {win.round}
        <span className="block font-mono text-xs uppercase tracking-wider">{win.ready ? "Collect it" : "Collect it when the time lock opens"}</span>
      </a>
    ))}
    <ul className="mt-3 divide-y divide-white/10">
      {rows.map((row) => (
        <li key={`${row.vaultId}:${row.round}`}>
          <a href={raidHistoryHref(row)} className="chalk-focus flex min-h-11 items-center justify-between gap-3 py-2">
            <span>
              <span className="block text-sm">{doorLabel(row.vaultId)}</span>
              <span className="font-mono text-xs text-chalk/60">Round {row.round}</span>
            </span>
            <span className="text-sm text-chalk/80">{raidHistoryLabel(row.state)}</span>
          </a>
        </li>
      ))}
    </ul>
    </>
  );
}
