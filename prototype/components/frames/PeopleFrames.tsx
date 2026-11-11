"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { DoorList } from "@/components/DoorList";
import { earned, gapToNext, nextMilestone } from "@/lib/standing";
import { BOARD_RULE, PLAYERS, TOKEN, WEEK_RULE, YOU, allDoors, shareLine } from "@/lib/demo/world";

const count = (n: number) => n.toLocaleString("en");

type Row = { name: string; place: number; nights: number; streak: number; line: string };

const ROWS: Row[] = PLAYERS.map((row) => ({ ...row, line: shareLine(row.name, row.place, row.nights, row.streak) }));

export function BoardFrame({ query }: { query: Record<string, string> }) {
  const state = query.state || "all";
  const period = state === "week" || state === "week-empty" ? "week" : "all";
  const loading = state === "loading";
  const empty = state === "empty" || state === "week-empty";
  const failed = state === "failed";
  const signed = state !== "out";
  const rows = empty ? [] : period === "week" ? ROWS.map((row) => ({ ...row, nights: Math.max(1, Math.min(row.nights, 3)) })) : ROWS;
  const me = signed ? YOU : null;
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Hall of fame</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Names, not ledgers.</h1>
        <p className="mt-2 text-sm text-chalk/65">A place shows the nights and the streak. It never shows the bill that worked.</p>
        <noscript><p className="mt-4 text-sm text-chalk/70">The board needs JavaScript to load. Turn it on to see who is ranked.</p></noscript>
        <BoardBody period={period} rows={loading || failed ? null : rows} failed={failed} me={me} remind={signed && state !== "raided"} />
      </div>
    </main>
  );
}

function BoardBody({ period, rows, failed, me, remind }: { period: "all" | "week"; rows: Row[] | null; failed: boolean; me: string | null; remind: boolean }) {
  const tabs = (
    <div role="group" aria-label="Which board" className="flex gap-2">
      {(["all", "week"] as const).map((value) => (
        <a key={value} href={value === "week" ? "/frames/fame?state=week" : "/frames/fame"} aria-pressed={period === value} className={`chalk-focus inline-flex min-h-11 items-center rounded-full px-4 text-sm ${period === value ? "bg-chalk text-ink" : "border border-chalk/30 text-chalk/80"}`}>
          {value === "all" ? "All time" : "This week"}
        </a>
      ))}
    </div>
  );
  if (failed) {
    return (
      <div className="mt-6">
        {tabs}
        <p role="status" className="mt-3 text-sm text-chalk/70">The board could not be read.</p>
        <a href="/frames/fame" className="chalk-focus mt-3 inline-flex min-h-11 items-center rounded-2xl border border-chalk/30 px-4 text-sm">Try again</a>
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
      {remind && mine && mine.streak > 0 ? <p className="mt-3 rounded-2xl border border-brass/40 px-4 py-2 text-sm text-brass">Open a raid today to keep your {mine.streak}-day streak. It resets at 00:00 UTC.</p> : null}
      <p className="mt-3 text-sm text-chalk/70">{period === "week" ? WEEK_RULE : BOARD_RULE}</p>
      <p className="mt-1 text-xs text-chalk/60">Nights in: rounds where your bill got in. Streak: days in a row you opened a raid.</p>
      <p className="mt-1 text-xs text-chalk/60">{count(rows.length)} names on the board.</p>
      {mine ? <a href={`#place-${encodeURIComponent(mine.name)}`} className="chalk-focus mt-3 inline-flex min-h-11 items-center rounded-2xl border border-uv/50 px-4 text-sm">You · #{mine.place}</a> : null}
      {mine ? <p className="mt-2 text-sm text-chalk/80">{gapToNext(rows, mine.name)} {nextMilestone(mine.nights, mine.streak)}</p> : null}
      <ol className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-night-2">
        {rows.map((row) => (
          <li key={row.name} id={`place-${encodeURIComponent(row.name)}`}>
            <a href={`/frames/player?name=${encodeURIComponent(row.name)}`} className={`chalk-focus flex items-center gap-4 px-4 py-3 transition hover:bg-white/5 ${row.name === me ? "bg-uv/10" : ""}`}>
              <span className="w-12 shrink-0 text-right font-sign text-2xl leading-none text-brass">{row.place}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sign text-lg">
                  {row.name}
                  {row.name === me ? <span className="ml-2 rounded bg-uv px-1.5 py-0.5 align-middle font-mono text-[10px] text-white">You</span> : null}
                </span>
                <span className="block text-sm text-chalk/70">{count(row.nights)} nights in · {count(row.streak)}-day streak</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

const RECENT = [
  { door: "Harbour Light", href: "/frames/door?id=harbour-light", day: "10 Nov", state: "in" as const },
  { door: "Labadi Tide", href: "/frames/door?id=labadi-tide", day: "9 Nov", state: "opened" as const },
  { door: "Ridge Canteen", href: "/frames/door?id=ridge-canteen", day: "8 Nov", state: "opened" as const },
];

export function PlayerFrame({ query }: { query: Record<string, string> }) {
  const asked = query.name || YOU;
  const invalid = query.state === "invalid" || !/^[A-Za-z][A-Za-z0-9]{2,23}$/.test(asked);
  const row = invalid ? null : ROWS.find((item) => item.name.toLowerCase() === asked.toLowerCase()) ?? null;
  const missing = query.state === "missing" || (!invalid && !row);
  const title = invalid ? "Not a player" : missing ? "Not on the board" : row?.name ?? asked;
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">On the board</p>
        <h1 className="mt-1 break-words font-sign text-3xl leading-tight">{title}</h1>
        {invalid ? <p className="mt-6 text-sm text-chalk/70">That is not a player name.</p> : null}
        {missing && !invalid ? <p className="mt-6 text-sm text-chalk/70">That name is not on the board. A name appears once its player opens a raid.</p> : null}
        {row ? (
          <div className="mt-6">
            <div className="rounded-2xl border border-white/10 bg-night-2">
              <div className="flex items-center gap-4 px-4 py-3">
                <span className="w-12 shrink-0 text-right font-sign text-2xl leading-none text-brass">{row.place}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sign text-lg">{row.name}{row.name === YOU ? <span className="ml-2 rounded bg-uv px-1.5 py-0.5 align-middle font-mono text-[10px] text-white">You</span> : null}</span>
                  <span className="block text-sm text-chalk/70">{count(row.nights)} nights in · {count(row.streak)}-day streak</span>
                </span>
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Milestones earned">
              {earned(row.nights, row.streak).map((label) => <li key={label} className="rounded-full border border-brass/50 px-3 py-1 font-mono text-xs text-brass">{label}</li>)}
            </ul>
            {row.name === YOU ? <p className="mt-2 text-sm text-chalk/80">{nextMilestone(row.nights, row.streak)}</p> : null}
            <section aria-labelledby="recent-nights" className="mt-4 rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
              <h2 id="recent-nights" className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Recent nights</h2>
              <ul className="mt-2 divide-y divide-white/10">
                {RECENT.map((night) => (
                  <li key={night.door} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <a href={night.href} className="chalk-focus min-w-0 truncate font-sign underline decoration-white/20">{night.door}</a>
                    <span className={night.state === "in" ? "shrink-0 text-brass" : "shrink-0 text-chalk/60"}>{night.state === "in" ? "Got in" : "Raided"} · {night.day}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

const HISTORY = [
  { door: "Harbour Light", round: "2", label: "Got in", href: "/frames/claim?id=harbour-light&state=locked" },
  { door: "Labadi Tide", round: "1", label: "Played", href: "/frames/reveal?id=labadi-tide&state=open" },
  { door: "Ridge Canteen", round: "1", label: "Approved, not recorded", href: "/frames/claim?id=ridge-canteen&state=held" },
  { door: "Salt Market", round: "1", label: "Approved, cannot be sent", href: "/frames/claim?id=salt-market&state=sponsor" },
  { door: "Warehouse Four", round: "1", label: "Not opened", href: "/frames/door?id=warehouse-four&state=never" },
];

export function ProfileFrame({ query }: { query: Record<string, string> }) {
  const state = query.state || "out";
  const signed = state !== "out";
  const [draft, setDraft] = useState(state === "edit" ? "Amber Quay" : "AmberQuay");
  const [logout, setLogout] = useState(state === "logout");
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Profile</p>
        <h1 className="mt-1 font-sign text-3xl leading-none">Your profile</h1>
        {signed ? <p className="mt-2 text-sm text-chalk/70">Signed in with your passkey on this browser.</p> : <p className="mt-2 text-sm text-chalk/70">Use your passkey when you need your account. A testnet account can be created when needed.</p>}
        {signed ? (
          <div className="mt-4">
            <label htmlFor="player-name" className="block text-sm text-chalk/80">Your name</label>
            <input id="player-name" value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 text-sm" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat k="Streak" v="3 days" />
              <Stat k="Nights in" v="6" />
              <Stat k="Place" v="#4" />
            </div>
            <p className="mt-2 text-sm text-chalk/70">{shareLine(YOU, 4, 6, 3)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={draft.trim() === "AmberQuay"} className="chalk-focus min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink disabled:opacity-40">Save name</button>
              <button type="button" className="chalk-focus min-h-11 rounded-2xl border border-chalk/30 px-4 py-2 text-sm">Another name</button>
            </div>
            <p className="mt-2 text-sm text-chalk/60">The name can be changed once. It is not your testnet account.</p>
            <a href="/frames/player?name=AmberQuay" className="chalk-focus mt-3 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">See your place</a>
            <button type="button" onClick={() => setLogout(true)} className="chalk-focus mt-3 block min-h-11 text-sm text-chalk/70 underline decoration-white/20">Log out</button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-chalk/70">Your name, streak, and nights come back with your passkey.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/frames/profile?state=in" className="chalk-focus inline-flex min-h-11 items-center rounded-2xl bg-chalk px-4 py-2 text-sm text-ink">Use your device passkey</a>
              <a href="/frames/passkey" className="chalk-focus inline-flex min-h-11 items-center rounded-2xl border border-chalk/30 px-4 py-2 text-sm">Create a passkey</a>
            </div>
          </div>
        )}
        <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">History</h2>
          {signed ? (
            <>
              <a href="/frames/claim?id=harbour-light&state=locked" className="chalk-focus mt-3 block rounded-2xl bg-brass px-4 py-3 font-sign text-lg text-ink">
                A cut is waiting · Harbour Light, round 2
                <span className="block font-mono text-xs uppercase tracking-wider">Collect it when the time lock opens</span>
              </a>
              <ul className="mt-3 divide-y divide-white/10">
                {HISTORY.map((row) => (
                  <li key={row.label}>
                    <a href={row.href} className="chalk-focus flex min-h-11 items-center justify-between gap-3 py-2">
                      <span>
                        <span className="block text-sm">{row.door}</span>
                        <span className="font-mono text-xs text-chalk/60">Round {row.round}</span>
                      </span>
                      <span className="text-sm text-chalk/80">{row.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="mt-2 text-sm text-chalk/70">No raid is recorded for you yet.</p>}
        </section>
        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">Case notes</h2>
          <p className="mt-2 text-sm text-chalk/70">Case notes stay with the raid. This page does not list them.</p>
        </section>
        <div className="mt-6 flex flex-wrap gap-x-5">
          <a href="/frames/sponsors" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">Sponsor a door</a>
        </div>
      </div>
      {logout ? <LogoutDialog onStay={() => setLogout(false)} /> : null}
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-2 px-3 py-3">
      <div className="font-mono text-xs uppercase tracking-wider text-chalk/80">{k}</div>
      <div className="mt-1 font-sign text-xl">{v}</div>
    </div>
  );
}

function LogoutDialog({ onStay }: { onStay: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const leaveRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onStay();
      if (event.key !== "Tab") return;
      const first = stayRef.current;
      const last = leaveRef.current;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStay]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onStay}>
      <div role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-note" className="w-full max-w-sm rounded-3xl bg-paper p-5 text-on-paper" onClick={(event) => event.stopPropagation()}>
        <h2 id="logout-title" className="font-sign text-2xl">Log out?</h2>
        <p id="logout-note" className="mt-2 text-sm">This browser forgets the sign-in, the saved payout account, and the raids and share card stored here. A win that has not been sent to the vault yet is kept. Your passkey, your name, and your account stay. Signing in again brings them back.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button ref={stayRef} type="button" onClick={onStay} className="chalk-focus min-h-11 rounded-2xl bg-on-paper px-4 py-2 text-sm text-paper">Stay signed in</button>
          <a ref={leaveRef} href="/frames/profile?state=out" className="chalk-focus inline-flex min-h-11 items-center rounded-2xl border border-rule px-4 py-2 text-sm">Log out</a>
        </div>
      </div>
    </div>
  );
}

const DEMO_KEY = `ed25519:${"ab".repeat(32)}`;

export function PasskeyFrame({ query }: { query: Record<string, string> }) {
  const step = query.state || "create";
  return (
    <main className="relative flex min-h-dvh items-end bg-night px-4 pb-24 pt-10 text-chalk sm:items-center sm:justify-center">
      <div className="absolute inset-x-0 top-0 px-4 pt-8"><SiteNav /></div>
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-night-2 p-6 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Account</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">{step === "done" ? "Saved." : step === "add" ? "Add this key" : "Your passkey"}</h1>
        {step === "existing" ? (
          <>
            <p className="mt-3 text-sm text-chalk/70">This browser is already signed in with your passkey.</p>
            <p className="mt-3 font-sign text-xl">AmberQuay</p>
            <a href="/frames/home" className="mt-6 block rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink">Continue</a>
            <p className="mt-4 text-sm text-chalk/60">To use another passkey, log out from the profile first.</p>
          </>
        ) : null}
        {step === "create" || step === "link" ? (
          <>
            <p className="mt-3 text-sm text-chalk/70">Use a passkey from your device or password manager. No seed phrase, no password. Clearing this site does not remove it.</p>
            <a href="/frames/passkey?state=done" className="mt-6 block w-full rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink shadow-[0_5px_0_#9c9483]">Create passkey</a>
            <h2 className="mt-8 border-t border-white/10 pt-5 font-sign text-lg">Already have a testnet account?</h2>
            <p className="mt-2 text-sm text-chalk/70">Name it, and a passkey is made for that account instead of a new one.</p>
            <label htmlFor="existing-account-id" className="mt-3 block text-sm text-chalk/80">Existing account ID</label>
            <input id="existing-account-id" defaultValue={step === "link" ? "amber-quay.testnet" : ""} placeholder="name.testnet" className="mt-2 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm" />
            <a href="/frames/passkey?state=add" className="mt-3 block w-full rounded-2xl border border-chalk/30 py-3 text-center text-sm">Link a passkey to this account</a>
          </>
        ) : null}
        {step === "add" ? (
          <>
            <p className="mt-3 text-sm text-chalk/70">A passkey is on this device for amber-quay.testnet. Add this public key in that wallet as a full-access key. The account pays the gas. Then check again.</p>
            <p className="mt-4 break-all font-mono text-[12px] text-chalk/70">{DEMO_KEY}</p>
            <button type="button" className="mt-3 rounded-2xl border border-chalk/30 px-4 py-2 text-sm">Copy key</button>
            <a href="/frames/passkey?state=done" className="mt-3 block w-full rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink">Check again</a>
          </>
        ) : null}
        {step === "done" ? (
          <>
            <p className="mt-3 text-sm text-chalk/70">This device can sign for amber-quay.testnet.</p>
            <a href="/frames/home" className="mt-6 block rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink">Continue</a>
          </>
        ) : null}
        <a href="/frames/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/70 underline decoration-white/20">Back to the door</a>
      </div>
    </main>
  );
}

export function SettingsFrame({ query }: { query: Record<string, string> }) {
  const signed = query.state !== "out";
  const [sound, setSound] = useState(query.state !== "off");
  const [tipsReset, setTipsReset] = useState(query.state === "tips");
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Settings</p>
        <h1 className="mt-1 font-sign text-3xl leading-none">This device</h1>
        {signed ? <p className="mt-2 text-sm text-chalk/70">Signed in with your passkey on this browser.</p> : <p className="mt-2 text-sm text-chalk/70">Use your passkey when you need your account. A testnet account can be created when needed.</p>}
        <div className="mt-4 space-y-4">
          <section className="rounded-3xl border border-white/10 bg-night-2 p-5">
            <h2 className="font-sign text-lg">Sign-in</h2>
            {signed ? (
              <>
                <p className="mt-2 text-sm text-chalk/70">Signed in on this browser as</p>
                <p className="mt-1 break-all font-mono text-[12px]">amber-quay.testnet</p>
                <a href="/frames/profile?state=logout" className="chalk-focus mt-2 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">Log out from the profile</a>
              </>
            ) : <p className="mt-2 text-sm text-chalk/70">This browser is not signed in. Your passkey signs you in from the profile, the queue, or a claim.</p>}
          </section>
          <section className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-night-2 p-5">
            <div>
              <h2 className="font-sign text-lg">Street sound</h2>
              <p className="mt-1 text-sm text-chalk/70">{sound ? "Plays from your first tap on the street." : "Off until you turn it on."}</p>
            </div>
            <button type="button" onClick={() => setSound((on) => !on)} aria-pressed={sound} aria-label={sound ? "Street sound on" : "Street sound off"} className="chalk-focus min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm">
              {sound ? "Sound on" : "Sound off"}
            </button>
          </section>
          <section className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-night-2 p-5">
            <div>
              <h2 className="font-sign text-lg">Tips</h2>
              <p className="mt-1 text-sm text-chalk/70" role="status">{tipsReset ? "The tips show again in your next raid." : "Short tips the first time you raid."}</p>
            </div>
            <button type="button" onClick={() => setTipsReset(true)} className="chalk-focus min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm">
              Show tips again
            </button>
          </section>
        </div>
        <div className="mt-8 space-y-2">
          <a href="/frames/profile" className="chalk-focus flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3">Profile</a>
          <a href="/frames/passkey" className="chalk-focus flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3">Passkey</a>
          <a href="/frames/home" className="chalk-focus flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3">The door</a>
        </div>
      </div>
    </main>
  );
}

export function VipFrame({ query }: { query: Record<string, string> }) {
  const failed = query.state === "failed";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 pt-8 text-chalk">
      <div className="px-4"><SiteNav /></div>
      <div className="mx-auto max-w-5xl px-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">VIP</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Sponsored doors</h1>
        <p className="mt-2 text-sm text-chalk/65">A sponsor funds the pot. Players still have to get past the bouncer. The unpaid list stays off this page.</p>
      </div>
      <DoorList title="Doors on the list" doors={failed ? [] : allDoors()} failed={failed} truncated={false} empty="No sponsored vault is listed." retryHref="/frames/vip" token={TOKEN} />
    </main>
  );
}
