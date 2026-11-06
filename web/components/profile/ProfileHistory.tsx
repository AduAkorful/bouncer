"use client";

import { useEffect, useState } from "react";
import { raidHistoryHref, raidHistoryLabel, type RaidHistoryRow } from "@/lib/raid-history";
import { listRaidHistory } from "@/lib/session-store";

export function ProfileHistory({ storageName }: { storageName: string }) {
  const [rows, setRows] = useState<RaidHistoryRow[] | { error: string } | null>(null);

  useEffect(() => {
    let live = true;
    listRaidHistory(storageName).then((found) => {
      if (live) setRows(found);
    });
    return () => {
      live = false;
    };
  }, [storageName]);

  if (rows === null) return <p className="mt-2 text-sm text-chalk/70">Reading this browser.</p>;
  if ("error" in rows) return <p role="status" className="mt-2 text-sm text-chalk/70">Raid history could not be read on this browser.</p>;
  if (rows.length === 0) return <p className="mt-2 text-sm text-chalk/70">No raid is stored on this device.</p>;
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
