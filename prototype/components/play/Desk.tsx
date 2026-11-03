"use client";

import { useState } from "react";
import { pastReceipts, poster, venue, type NoteSource } from "@/lib/demo/raider";

export interface Note {
  id: string;
  text: string;
  source: NoteSource;
  mark?: "true" | "rumour";
}

type Tab = "Notes" | "Receipts" | "Payees" | "Poster" | "Inside";

/**
 * The investigation desk: everything public about tonight, plus what you've overheard. Free to use, no clock.
 * Notes can be marked believed or rumour; that's only for the player, the guard never sees it.
 */
export function Desk({
  notes,
  inside,
  onPin,
  onMark,
  onClose,
}: {
  notes: Note[];
  /** The office is open: show what's been found inside */
  inside: boolean;
  onPin: (n: Note) => void;
  onMark: (id: string, mark: Note["mark"]) => void;
  onClose: () => void;
}) {
  const tabs: Tab[] = inside ? ["Notes", "Inside", "Receipts", "Payees", "Poster"] : ["Notes", "Receipts", "Payees", "Poster"];
  const [tab, setTab] = useState<Tab>("Notes");
  const pinned = new Set(notes.map((n) => n.id));
  const insideNotes = notes.filter((n) => n.source === "Found" || n.text.includes("(barman)"));
  return (
    <div className="flex max-h-full flex-col rounded-t-3xl bg-paper text-on-paper" role="dialog" aria-label="Investigation desk">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="font-sign text-xl">The desk</span>
        <button onClick={onClose} className="rounded-full border border-on-paper/30 px-3 py-1 text-sm">
          Close
        </button>
      </div>
      <nav className="mt-3 flex gap-1 overflow-x-auto border-b border-rule px-4 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${t === tab ? "bg-on-paper font-semibold text-paper" : "text-muted"}`}
          >
            {t}
            {t === "Notes" && notes.length > 0 && <span className="ml-1 font-mono text-[11px] opacity-70">{notes.length}</span>}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm">
        {tab === "Notes" &&
          (notes.length === 0 ? (
            <p className="text-muted">
              Nothing yet. Tap people in the queue to listen in, and pin anything useful from the receipts. Not everything you hear is true.
            </p>
          ) : (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start gap-3 rounded-xl border border-rule p-3">
                  <span className="mt-0.5 shrink-0 rounded bg-on-paper/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">{n.source}</span>
                  <span className={`flex-1 ${n.mark === "rumour" ? "text-muted line-through" : ""}`}>{n.text}</span>
                  {n.source === "Heard" && (
                    <span className="flex shrink-0 gap-1">
                      <button
                        aria-label="I believe this"
                        aria-pressed={n.mark === "true"}
                        onClick={() => onMark(n.id, n.mark === "true" ? undefined : "true")}
                        className={`size-7 rounded-full border text-xs ${n.mark === "true" ? "border-uv bg-uv text-white" : "border-rule"}`}
                      >
                        ✓
                      </button>
                      <button
                        aria-label="Rumour"
                        aria-pressed={n.mark === "rumour"}
                        onClick={() => onMark(n.id, n.mark === "rumour" ? undefined : "rumour")}
                        className={`size-7 rounded-full border text-xs ${n.mark === "rumour" ? "border-rope bg-rope text-white" : "border-rule"}`}
                      >
                        ✗
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {tab === "Inside" &&
          (insideNotes.length === 0 ? (
            <p className="text-muted">Look around the office: the corkboard, the bin, the barman in the doorway.</p>
          ) : (
            <ul className="space-y-2">
              {insideNotes.map((n) => (
                <li key={n.id} className="rounded-xl border border-rule p-3 font-mono text-[12.5px]">
                  {n.text}
                </li>
              ))}
            </ul>
          ))}

        {tab === "Receipts" && (
          <div className="space-y-3">
            <p className="text-muted">Earlier rounds, revealed at their resets. Tap a line to pin it.</p>
            {pastReceipts.map((r) => (
              <div key={r.round} className="rounded-xl border border-rule p-3 font-mono text-[12px] leading-relaxed">
                <div className="mb-1 text-muted">Round {r.round}</div>
                {r.lines.map((l) => {
                  const id = `r${r.round}-${l}`;
                  return (
                    <button
                      key={l}
                      onClick={() => onPin({ id, text: `Round ${r.round}: ${l}`, source: "Receipt" })}
                      className={`block w-full rounded px-1 py-0.5 text-left transition hover:bg-on-paper/5 ${pinned.has(id) ? "text-uv" : ""}`}
                    >
                      {pinned.has(id) ? "📌 " : ""}
                      {l}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {tab === "Payees" && (
          <ul className="space-y-2">
            {venue.payees.map((p) => (
              <li key={p.name} className="rounded-xl border border-rule p-3">
                <div className="font-semibold">{p.name}</div>
                <div className="text-muted">{p.role}</div>
              </li>
            ))}
          </ul>
        )}

        {tab === "Poster" && (
          <button
            onClick={() => onPin({ id: "poster", text: "Poster: Sat · K-Nova · headline 23:00–02:00", source: "Poster" })}
            className="mx-auto block w-full max-w-[260px] rotate-[-2deg] bg-night p-5 text-center text-chalk shadow-xl"
          >
            <div className="font-sign-inline text-3xl neon-uv">{poster.title}</div>
            {poster.lines.map((l) => (
              <div key={l} className="mt-2 font-sign text-sm">
                {l}
              </div>
            ))}
            <div className="mt-4 font-mono text-[10px] text-chalk/50">{pinned.has("poster") ? "📌 Pinned" : "Tap to pin"}</div>
          </button>
        )}
      </div>
    </div>
  );
}
