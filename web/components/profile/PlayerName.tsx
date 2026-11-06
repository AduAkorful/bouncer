"use client";

import { useState } from "react";
import { loadPlayerSession, rollPlayerName, savePlayerName, type PlayerSession } from "@/lib/player-session";
import { unlockDevice, deriveSecrets } from "@/lib/device-pass";

/** The name, streak, and nights come back with the passkey. This browser is not the record. */
export function PlayerName({ initial = null }: { initial?: PlayerSession | null }) {
  const [session, setSession] = useState<PlayerSession | null>(initial);
  const [draft, setDraft] = useState(initial?.player.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    setError(null);
    const result = await loadPlayerSession();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSession(result.session);
    setDraft(result.session.player.name);
  }

  async function save(nextName: string) {
    setBusy(true);
    setError(null);
    const unlocked = await unlockDevice();
    if ("error" in unlocked) {
      setBusy(false);
      setError(unlocked.error);
      return;
    }
    const secrets = await deriveSecrets(unlocked.ikm, "account", "0");
    unlocked.ikm.fill(0);
    if ("error" in secrets) {
      setBusy(false);
      setError("This phone cannot keep a key in the passkey.");
      return;
    }
    const result = await savePlayerName(secrets, nextName);
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
    const unlocked = await unlockDevice();
    if ("error" in unlocked) {
      setBusy(false);
      setError(unlocked.error);
      return;
    }
    const secrets = await deriveSecrets(unlocked.ikm, "account", "0");
    unlocked.ikm.fill(0);
    if ("error" in secrets) {
      setBusy(false);
      setError("This phone cannot keep a key in the passkey.");
      return;
    }
    const result = await rollPlayerName(secrets);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSession(result.session);
    setDraft(result.session.player.name);
  }

  if (!session) {
    return (
      <div className="mt-4">
        <p className="text-sm text-chalk/70">Your name, streak, and nights come back with your passkey.</p>
        {error ? <p role="status" className="mt-2 text-sm text-chalk/70">{error}</p> : null}
        <button type="button" disabled={busy} onClick={() => void enter()} className="chalk-focus mt-3 min-h-11 rounded-2xl bg-chalk px-4 py-2 text-sm text-ink disabled:opacity-40">
          {busy ? "Waiting for your passkey" : "Use your passkey"}
        </button>
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
      <p className="mt-3 font-sign text-xl">{session.player.streak} day streak · {session.player.nights} {session.player.nights === 1 ? "night" : "nights"} in{session.place ? ` · ${session.line}` : ""}</p>
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
    </div>
  );
}
