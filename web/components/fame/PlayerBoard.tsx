"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type BoardRow = { name: string; place: number; nights: number; streak: number; line: string };

/** The public board. A bill is not on it. */
export function PlayerBoard({ highlight = "" }: { highlight?: string }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    apiGet("/player/board").then((result) => {
      if (!live) return;
      const body = result.ok && result.body && typeof result.body === "object" ? result.body as { ok?: unknown; players?: BoardRow[] } : null;
      if (!body || body.ok !== true || !Array.isArray(body.players)) {
        setFailed(true);
        return;
      }
      setRows(body.players);
    });
    return () => { live = false; };
  }, []);

  const shown = highlight ? rows?.filter((row) => row.name === highlight) ?? [] : rows ?? [];
  const line = shown[0]?.line;

  async function copy() {
    if (!line) return;
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (failed) return <p role="status" className="mt-6 text-sm text-chalk/70">The board could not be read.</p>;
  if (!rows) return <p className="mt-6 text-sm text-chalk/60">Reading the board.</p>;
  if (shown.length === 0) return <p className="mt-6 text-sm text-chalk/70">{highlight ? "That name is not on the board." : "No names are on the board yet."}</p>;

  return (
    <div className="mt-6">
      <ol className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-night-2">
        {shown.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <a href={`/p/${encodeURIComponent(row.name)}`} className="min-w-0">
              <span className="block font-sign text-lg">{row.name}</span>
              <span className="text-sm text-chalk/70">{row.nights} {row.nights === 1 ? "night" : "nights"} in · streak {row.streak}</span>
            </a>
            <span className="font-mono text-sm text-chalk/80">{row.place}</span>
          </li>
        ))}
      </ol>
      {line ? (
        <button type="button" onClick={() => void copy()} className="chalk-focus mt-4 min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink">
          {copied ? "Copied" : "Copy your place"}
        </button>
      ) : null}
    </div>
  );
}
