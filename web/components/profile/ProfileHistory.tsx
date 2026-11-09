"use client";

import { useEffect, useState } from "react";
import { mergeHistory, raidHistoryHref, raidHistoryLabel, type RaidHistoryRow } from "@/lib/raid-history";
import { listRaidHistory } from "@/lib/session-store";
import { subscribeNights, type ServerNight } from "@/lib/session-nights";

/** One list: the raids on this browser, plus the nights the server keeps for this passkey. */
export function ProfileHistory({ storageName }: { storageName: string }) {
  const [device, setDevice] = useState<RaidHistoryRow[] | { error: string } | null>(null);
  const [server, setServer] = useState<ServerNight[]>([]);

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

  if (device === null) return <p className="mt-2 text-sm text-chalk/70">Reading this browser.</p>;
  const failed = "error" in device;
  const rows = mergeHistory(failed ? [] : device, server);
  if (rows.length === 0) {
    return <p role={failed ? "status" : undefined} className="mt-2 text-sm text-chalk/70">{failed ? "Raid history could not be read on this browser." : "No raid is recorded for you yet."}</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-white/10">
      {rows.map((row) => (
        <li key={`${row.vaultId}:${row.round}`}>
          <a href={raidHistoryHref(row)} className="chalk-focus flex min-h-11 items-center justify-between gap-3 py-2">
            <span>
              <span className="block text-sm">{row.vaultId}</span>
              <span className="font-mono text-xs text-chalk/60">Round {row.round}</span>
            </span>
            <span className="text-sm text-chalk/80">{raidHistoryLabel(row.state)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
