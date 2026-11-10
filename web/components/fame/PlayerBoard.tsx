"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { readHold } from "@/lib/player-hold";
import { loadPlayerSession } from "@/lib/player-session";
import { earned, gapToNext, nextMilestone } from "@/lib/standing";

export type BoardRow = { name: string; place: number; nights: number; streak: number; line: string };

const PAGE = 50;
const READ_MS = 15_000;
const TERMS = "Nights in: rounds where your bill got in. Streak: days in a row you opened a raid.";

const count = (n: number) => n.toLocaleString("en");

/** The signed-in player's name, read only when this browser already holds a sign-in, so no passkey prompt appears. */
function useMyName(): string | null {
  return useMe()?.name ?? null;
}

type Me = { name: string; streak: number; raidedToday: boolean };

function useMe(): Me | null {
  const [name, setName] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    void readHold().then((held) => {
      if (!held || !live) return;
      held.fill(0);
      loadPlayerSession().then((result) => {
        if (live && result.ok) setName({ name: result.session.player.name, streak: result.session.player.streak, raidedToday: result.session.player.raidedToday === true });
      }).catch(() => undefined);
    });
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
  const meInfo = useMe();
  const me = meInfo?.name ?? null;
  const [period, setPeriod] = useState<"all" | "week">("all");

  const read = useCallback(async (offset: number) => {
    const result = await apiGet(`/player/board?limit=${PAGE}&offset=${offset}${period === "week" ? "&period=week" : ""}`, READ_MS);
    const body = result.ok && result.body && typeof result.body === "object" ? result.body as { ok?: unknown; players?: BoardRow[]; total?: unknown; rule?: unknown } : null;
    if (!body || body.ok !== true || !Array.isArray(body.players)) return null;
    return { players: body.players, total: typeof body.total === "number" ? body.total : body.players.length, rule: typeof body.rule === "string" ? body.rule : null };
  }, [period]);

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

  const tabs = (
      <div role="group" aria-label="Which board" className="flex gap-2">
      {(["all", "week"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={period === value}
          onClick={() => { setRows(null); setPeriod(value); }}
          className={`chalk-focus min-h-11 rounded-full px-4 text-sm ${period === value ? "bg-chalk text-ink" : "border border-chalk/30 text-chalk/80"}`}
        >
          {value === "all" ? "All time" : "This week"}
        </button>
      ))}
    </div>
  );

  if (failed) {
    return (
      <div className="mt-6">
        {tabs}
        <p role="status" className="mt-3 text-sm text-chalk/70">The board could not be read.</p>
        <button type="button" onClick={() => void first()} className="chalk-focus mt-3 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm">Try again</button>
      </div>
    );
  }
  if (!rows) {
    return (
      <div className="mt-6" role="status" aria-label="Reading the board">
        {tabs}
        <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-night-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3">
              <span className="h-6 w-12 animate-pulse rounded bg-white/10" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block h-4 w-2/5 animate-pulse rounded bg-white/10" />
                <span className="block h-3 w-3/5 animate-pulse rounded bg-white/5" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (rows.length === 0) return <div className="mt-6">{tabs}<p className="mt-3 text-sm text-chalk/70">{period === "week" ? "Nobody has raided this week yet. Be the first on this week's board." : "No names are on the board yet. Get a bill past a door to be the first."}</p></div>;

  const mine = me ? rows.find((row) => row.name === me) : undefined;
  return (
    <div className="mt-6">
      {tabs}
      {meInfo && meInfo.streak > 0 && !meInfo.raidedToday ? (
        <p className="mt-3 rounded-2xl border border-brass/40 px-4 py-2 text-sm text-brass">Open a raid today to keep your {meInfo.streak}-day streak. It resets at 00:00 UTC.</p>
      ) : null}
      {rule ? <p className="mt-3 text-sm text-chalk/70">{rule}</p> : null}
      <p className="mt-1 text-xs text-chalk/60">{TERMS}</p>
      <p className="mt-1 text-xs text-chalk/60">{count(total)} {total === 1 ? "name" : "names"} on the board.</p>
      {mine ? (
        <a href={`#place-${encodeURIComponent(mine.name)}`} className="chalk-focus mt-3 inline-flex min-h-11 items-center rounded-2xl border border-uv/50 px-4 text-sm">
          You · #{mine.place}
        </a>
      ) : null}
      {mine ? (
        <p className="mt-2 text-sm text-chalk/80">
          {gapToNext(rows, mine.name)} {nextMilestone(mine.nights, mine.streak)}
        </p>
      ) : me ? (
        <p className="mt-2 text-sm text-chalk/80">You are signed in as {me}. Open a raid to get on the board.</p>
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

/** The whole card is the link, and its text starts with the place, so a screen reader hears the place first. The name is the visible text, not a label over it. */
function BoardRowLink({ row, me, current = false }: { row: BoardRow; me: boolean; current?: boolean }) {
  const body = (
    <>
      <span className="w-12 shrink-0 text-right font-sign text-2xl leading-none text-brass">{row.place}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sign text-lg">
          {row.name}
          {me ? <span className="ml-2 rounded bg-uv px-1.5 py-0.5 align-middle font-mono text-[10px] text-white">You</span> : null}
        </span>
        <span className="block text-sm text-chalk/70">{count(row.nights)} {row.nights === 1 ? "night" : "nights"} in · {count(row.streak)}-day streak</span>
      </span>
    </>
  );
  const shape = `flex items-center gap-4 px-4 py-3 ${me ? "bg-uv/10" : ""}`;
  if (current) return <div className={shape}>{body}</div>;
  return (
    <a href={`/p/${encodeURIComponent(row.name)}`} aria-current={me ? "true" : undefined} className={`chalk-focus ${shape} transition hover:bg-white/5`}>
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

  // The last nights: a door's name, the day, and whether they got in. Never a bill.
  const [recent, setRecent] = useState<{ door: string; vaultId: string; day: string; state: "opened" | "in" }[]>([]);
  useEffect(() => {
    let live = true;
    apiGet(`/player/recent/${encodeURIComponent(name)}`, READ_MS).then((result) => {
      const body = result.ok && result.body && typeof result.body === "object" ? result.body as { ok?: unknown; nights?: unknown } : null;
      if (live && body?.ok === true && Array.isArray(body.nights)) setRecent(body.nights as typeof recent);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [name]);

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
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Milestones earned">
        {earned(row.nights, row.streak).map((label) => (
          <li key={label} className="rounded-full border border-brass/50 px-3 py-1 font-mono text-xs text-brass">{label}</li>
        ))}
      </ul>
      {row.name === me ? <p className="mt-2 text-sm text-chalk/80">{nextMilestone(row.nights, row.streak)}</p> : null}
      {recent.length > 0 ? (
        <section aria-labelledby="recent-nights" className="mt-4 rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
          <h2 id="recent-nights" className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Recent nights</h2>
          <ul className="mt-2 divide-y divide-white/10">
            {recent.map((night, i) => (
              <li key={`${night.vaultId}-${night.day}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <a href={`/v/${encodeURIComponent(night.vaultId)}`} className="chalk-focus min-w-0 truncate font-sign underline decoration-white/20">{night.door}</a>
                <span className={night.state === "in" ? "shrink-0 text-brass" : "shrink-0 text-chalk/60"}>{night.state === "in" ? "Got in" : "Raided"} · {night.day}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-2 text-xs text-chalk/60">{TERMS}</p>
      <button type="button" onClick={() => void share()} className="chalk-focus mt-4 min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink">
        {copied ?? "Share this place"}
      </button>
    </div>
  );
}
