"use client";

import Link from "next/link";
import { useState } from "react";
import type { CrewEnv } from "@/lib/config";
import { buildCreateCrew } from "@/lib/crew";

export function CreateCrew({ env }: { env: CrewEnv }) {
  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState(["", ""]);
  const [ready, setReady] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function prepare() {
    const built = buildCreateCrew(env, name, accounts);
    if (!built.ok) {
      setReady(null);
      setError("That crew cannot be created from what is on this screen.");
      return;
    }
    setError(null);
    setReady(built.call.daoAccount);
  }

  return (
    <main className="min-h-dvh bg-night px-4 pb-16 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Crew</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">Start a crew</h1>
        <p className="mt-2 max-w-[40ch] text-sm text-chalk/70">Two to four accounts. The DAO is the council. This screen prepares the call and does not send it.</p>
        <label className="mt-6 block">
          <span className="font-mono text-xs uppercase tracking-wider text-chalk/80">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-2xl border border-white/15 bg-night-2 px-4 py-3 font-sign text-lg outline-none" />
        </label>
        <div className="mt-4 space-y-2">
          <div className="font-mono text-xs uppercase tracking-wider text-chalk/80">Council</div>
          {accounts.map((account, index) => (
            <input
              key={index}
              value={account}
              onChange={(event) => setAccounts(accounts.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
              autoComplete="off"
              placeholder="account.testnet"
              className="w-full rounded-2xl border border-white/15 bg-night-2 px-4 py-3 font-mono text-sm outline-none"
            />
          ))}
          {accounts.length < 4 ? (
            <button type="button" onClick={() => setAccounts([...accounts, ""])} className="text-sm text-chalk/70 underline decoration-white/20">
              Add an account
            </button>
          ) : null}
        </div>
        <button type="button" onClick={prepare} className="mt-6 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink">
          Prepare the DAO
        </button>
        {error ? <p className="mt-4 text-sm text-rope">{error}</p> : null}
        {ready ? (
          <p className="mt-4 text-sm text-chalk/80">
            The council account would be <span className="font-mono">{ready}</span>. Nothing was sent.
          </p>
        ) : null}
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}
