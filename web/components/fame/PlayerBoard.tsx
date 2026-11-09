"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { readHold } from "@/lib/player-hold";
import { loadPlayerSession } from "@/lib/player-session";

export type BoardRow = { name: string; place: number; nights: number; streak: number; line: string };

const PAGE = 50;
const READ_MS = 15_000;
const TERMS = "Nights in: rounds where your bill got in. Streak: days in a row you opened a raid.";

const count = (n: number) => n.toLocaleString("en");

/** The signed-in player's name, read only when this browser already holds a sign-in, so no passkey prompt appears. */
function useMyName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const held = readHold();
    if (!held) return;
    held.fill(0);
    let live = true;
    loadPlayerSession().then((result) => {
      if (live && result.ok) setName(result.session.player.name);
    }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return name;
}

/** The public board. A bill is not on it. */
export function PlayerBoard() {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [rule, setRule] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const me = useMyName();

  const read = useCallback(async (offset: number) => {
    const result = await apiGet(`/player/board?limit=${PAGE}&offset=${offset}`, READ_MS);
    const body = result.ok && result.body && typeof result.body === "object" ? result.body as { ok?: unknown; players?: BoardRow[]; total?: unknown; rule?: unknown } : null;
    if (!body || body.ok !== true || !Array.isArray(body.players)) return null;
    return { players: body.players, total: typeof body.total === "number" ? body.total : body.players.length, rule: typeof body.rule === "string" ? body.rule : null };
  }, []);

  const first = useCallback(async () => {
    setFailed(false);
    setRows(null);
    const page = await read(0);
    if (!page) {
      setFailed(true);
      return;
    }
    setRows(page.players);
    setTotal(page.total);
    setRule(page.rule);
  }, [read]);

  useEffect(() => {
    void first();
  }, [first]);

  async function more() {
    if (!rows) return;
    setLoadingMore(true);
    const page = await read(rows.length);
    setLoadingMore(false);
    if (page) setRows([...rows, ...page.players]);
  }

  if (failed) {
    return (
      <div className="mt-6">
        <p role="status" className="text-sm text-chalk/70">The board could not be read.</p>
        <button type="button" onClick={() => void first()} className="chalk-focus mt-3 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm">Try again</button>
      </div>
    );
  }
  if (!rows) return <p role="status" className="mt-6 text-sm text-chalk/60">Reading the board.</p>;
  if (rows.length === 0) return <p className="mt-6 text-sm text-chalk/70">No names are on the board yet. Get a bill past a door to be the first.</p>;

  const mine = me ? rows.find((row) => row.name === me) : undefined;
  return (
    <div className="mt-6">
      {rule ? <p className="text-sm text-chalk/70">{rule}</p> : null}
      <p className="mt-1 text-xs text-chalk/60">{TERMS}</p>
      <p className="mt-1 text-xs text-chalk/60">{count(total)} {total === 1 ? "name" : "names"} on the board.</p>
      {mine ? (
        <a href={`#place-${encodeURIComponent(mine.name)}`} className="chalk-focus mt-3 inline-flex min-h-11 items-center rounded-2xl border border-uv/50 px-4 text-sm">
          You · #{mine.place}
        </a>
      ) : null}
      <ol className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-night-2">
        {rows.map((row) => (
          <li key={row.name} id={`place-${encodeURIComponent(row.name)}`}>
            <BoardRowLink row={row} me={row.name === me} />
          </li>
        ))}
      </ol>
      {rows.length < total ? (
        <button type="button" disabled={loadingMore} onClick={() => void more()} className="chalk-focus mt-4 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm disabled:opacity-40">
          {loadingMore ? "Reading more…" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

/** The whole card is the link, and its name starts with the place, so a screen reader hears the place first. */
function BoardRowLink({ row, me, current = false }: { row: BoardRow; me: boolean; current?: boolean }) {
  const body = (
    <>
      <span className="w-12 shrink-0 text-right font-sign text-2xl leading-none text-brass" aria-hidden="true">{row.place}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sign text-lg">
          {row.name}
          {me ? <span className="ml-2 rounded bg-uv px-1.5 py-0.5 align-middle font-mono text-[10px] text-white">You</span> : null}
        </span>
        <span className="block text-sm text-chalk/70">{count(row.nights)} {row.nights === 1 ? "night" : "nights"} in · {count(row.streak)}-day streak</span>
      </span>
    </>
  );
  const label = `Place ${row.place}: ${row.name}${me ? " (you)" : ""}, ${row.nights} ${row.nights === 1 ? "night" : "nights"} in, ${row.streak}-day streak`;
  const shape = `flex items-center gap-4 px-4 py-3 ${me ? "bg-uv/10" : ""}`;
  if (current) return <div className={shape} aria-label={label}>{body}</div>;
  return (
    <a href={`/p/${encodeURIComponent(row.name)}`} aria-label={label} aria-current={me ? "true" : undefined} className={`chalk-focus ${shape} transition hover:bg-white/5`}>
      {body}
    </a>
  );
}

/** One player's place, read on its own. Sharing carries the link, so a paste brings people back. */
export function PlayerPlace({ name }: { name: string }) {
  const [row, setRow] = useState<BoardRow | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const me = useMyName();

  const read = useCallback(async () => {
    setFailed(false);
    setRow(undefined);
    const result = await apiGet(`/player/place/${encodeURIComponent(name)}`, READ_MS);
    const body = result.ok && result.body && typeof result.body === "object" ? result.body as { ok?: unknown; player?: BoardRow | null } : null;
    if (!body || body.ok !== true) {
      setFailed(true);
      return;
    }
    setRow(body.player ?? null);
  }, [name]);

  useEffect(() => {
    void read();
  }, [read]);

  async function share() {
    if (!row) return;
    const url = `${window.location.origin}/p/${encodeURIComponent(row.name)}`;
    const text = `${row.line} ${url}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `${row.name} on Bouncer`, text: row.line, url });
        setCopied("Shared");
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied("Link copied");
    } catch {
      setCopied(null);
    }
  }

  if (failed) {
    return (
      <div className="mt-6">
        <p role="status" className="text-sm text-chalk/70">The board could not be read.</p>
        <button type="button" onClick={() => void read()} className="chalk-focus mt-3 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm">Try again</button>
      </div>
    );
  }
  if (row === undefined) return <p role="status" className="mt-6 text-sm text-chalk/60">Reading the board.</p>;
  if (row === null) return <p className="mt-6 text-sm text-chalk/70">That name is not on the board. A name appears once its player opens a raid.</p>;
  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-white/10 bg-night-2">
        <BoardRowLink row={row} me={row.name === me} current />
      </div>
      <p className="mt-2 text-xs text-chalk/60">{TERMS}</p>
      <button type="button" onClick={() => void share()} className="chalk-focus mt-4 min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink">
        {copied ?? "Share this place"}
      </button>
    </div>
  );
}
