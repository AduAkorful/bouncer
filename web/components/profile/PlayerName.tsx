"use client";

import { useEffect, useRef, useState } from "react";
import { loadPlayerSession, rollPlayerName, savePlayerName, type PlayerSession } from "@/lib/player-session";
import { deriveSecrets, unlockDevice } from "@/lib/device-pass";
import { clearHold, holdIkm, readHold, unlockHeld } from "@/lib/player-hold";
import { writePayoutAccount } from "@/lib/imported-account";

/** The name, streak, and nights come back with the passkey. This browser is not the record. */
export function PlayerName({ initial = null, storageName = "" }: { initial?: PlayerSession | null; storageName?: string }) {
  const [session, setSession] = useState<PlayerSession | null>(initial);
  const [draft, setDraft] = useState(initial?.player.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(initial !== null);
  const [signedIn, setSignedIn] = useState(initial !== null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (initial) return;
    let live = true;
    if (!readHold()) {
      setChecked(true);
      return;
    }
    setSignedIn(true);
    setBusy(true);
    loadPlayerSession().then((result) => {
      if (!live) return;
      setBusy(false);
      setChecked(true);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession(result.session);
      setDraft(result.session.player.name);
    }).catch(() => {
      if (!live) return;
      setBusy(false);
      setChecked(true);
      setError("The player record could not be read.");
    });
    return () => { live = false; };
  }, [initial]);

  function logout() {
    clearHold();
    // The saved payout account goes too, so the next person on this browser does not see its key or Send.
    writePayoutAccount(window.localStorage, storageName, null);
    setSession(null);
    setDraft("");
    setError(null);
    setSignedIn(false);
    setConfirming(false);
    window.location.reload();
  }

  async function accountSecrets() {
    const unlocked = await unlockHeld();
    if ("error" in unlocked) return unlocked;
    const secrets = await deriveSecrets(unlocked.ikm, "account", "0");
    unlocked.ikm.fill(0);
    if ("error" in secrets) return { error: "This device cannot keep a key in the passkey." };
    return { secrets };
  }

  async function create() {
    setBusy(true);
    setError(null);
    const unlocked = await unlockDevice(undefined, "create");
    if ("error" in unlocked) {
      setBusy(false);
      setError(unlocked.error);
      return;
    }
    holdIkm(unlocked.ikm);
    unlocked.ikm.fill(0);
    const result = await loadPlayerSession();
    setBusy(false);
    setSignedIn(true);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSession(result.session);
    setDraft(result.session.player.name);
  }

  async function enter() {
    setBusy(true);
    setError(null);
    const result = await loadPlayerSession();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSignedIn(true);
    setSession(result.session);
    setDraft(result.session.player.name);
  }

  async function save(nextName: string) {
    setBusy(true);
    setError(null);
    const ready = await accountSecrets();
    if ("error" in ready) {
      setBusy(false);
      setError(ready.error);
      return;
    }
    const result = await savePlayerName(ready.secrets, nextName);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSession(result.session);
    setDraft(result.session.player.name);
  }

  async function another() {
    setBusy(true);
    setError(null);
    const ready = await accountSecrets();
    if ("error" in ready) {
      setBusy(false);
      setError(ready.error);
      return;
    }
    const result = await rollPlayerName(ready.secrets);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSession(result.session);
    setDraft(result.session.player.name);
  }

  if (!checked) {
    return <p className="mt-4 text-sm text-chalk/70">Reading this browser.</p>;
  }

  if (!session) {
    return (
      <div className="mt-4">
        <p className="text-sm text-chalk/70">{signedIn ? "This browser is signed in. The name has not loaded." : "Your name, streak, and nights come back with your passkey."}</p>
        {error ? <p role="status" className="mt-2 text-sm text-chalk/70">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void enter()} className="chalk-focus min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink disabled:opacity-40">
            {busy ? "Waiting for your passkey" : signedIn ? "Try again" : "Use your device passkey"}
          </button>
          {signedIn ? null : (
            <button type="button" disabled={busy} onClick={() => void create()} className="chalk-focus min-h-11 rounded-2xl border border-chalk/30 px-4 py-2 text-sm disabled:opacity-40">
              Create a passkey
            </button>
          )}
        </div>
        {signedIn ? <button type="button" onClick={() => setConfirming(true)} className="chalk-focus mt-3 block min-h-11 text-sm text-chalk/70 underline decoration-white/20">Log out</button> : null}
        {confirming ? <LogoutDialog onStay={() => setConfirming(false)} onLogout={logout} /> : null}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label htmlFor="player-name" className="block text-sm text-chalk/80">Your name</label>
      <input
        id="player-name"
        value={draft}
        readOnly={session.player.renameUsed}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 text-sm read-only:text-chalk/70"
      />
      {error ? <p role="status" className="mt-2 text-sm text-chalk/70">{error}</p> : null}
      {/* The tiles show only what the player record holds. Before it loads they are not drawn at all. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat k="Streak" v={`${session.player.streak} ${session.player.streak === 1 ? "day" : "days"}`} />
        <Stat k="Nights in" v={String(session.player.nights)} />
        <Stat k="Place" v={session.place ? `#${session.place}` : "Not yet"} />
      </div>
      {session.line ? <p className="mt-2 text-sm text-chalk/70">{session.line}</p> : null}
      {session.player.renameUsed ? <p className="mt-2 text-sm text-chalk/60">This name was changed once. It stays.</p> : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void save(draft)} className="chalk-focus min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink disabled:opacity-40">Save name</button>
          <button type="button" disabled={busy} onClick={() => void another()} className="chalk-focus min-h-11 rounded-2xl border border-chalk/30 px-4 py-2 text-sm disabled:opacity-40">Another name</button>
        </div>
      )}
      <p className="mt-2 text-sm text-chalk/60">The name can be changed once. It is not your testnet account.</p>
      {session.nights.length > 0 ? (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          {session.nights.map((night) => (
            <li key={`${night.vaultId}:${night.round}`} className="flex justify-between gap-3 py-2">
              <span>{night.vaultId} · round {night.round}</span>
              <span className="text-chalk/70">{night.state === "in" ? "Got in" : "Opened"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {session.line ? <a href={`/p/${encodeURIComponent(session.player.name)}`} className="chalk-focus mt-3 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">Share your place</a> : null}
      <button type="button" onClick={() => setConfirming(true)} className="chalk-focus mt-3 block min-h-11 text-sm text-chalk/70 underline decoration-white/20">Log out</button>
      {confirming ? <LogoutDialog onStay={() => setConfirming(false)} onLogout={logout} /> : null}
    </div>
  );
}

function LogoutDialog({ onStay, onLogout }: { onStay: () => void; onLogout: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onStay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStay]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onStay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-note"
        className="w-full max-w-sm rounded-3xl bg-paper p-5 text-on-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="logout-title" className="font-sign text-2xl">Log out?</h2>
        <p id="logout-note" className="mt-2 text-sm">This browser forgets the sign-in and the saved payout account. Your passkey, your name, and your account stay. Signing in again brings them back.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button ref={stayRef} type="button" onClick={onStay} className="chalk-focus min-h-11 rounded-2xl bg-on-paper px-4 py-2 text-sm text-paper">Stay signed in</button>
          <button type="button" onClick={onLogout} className="chalk-focus min-h-11 rounded-2xl border border-rule px-4 py-2 text-sm">Log out</button>
        </div>
      </div>
    </div>
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
