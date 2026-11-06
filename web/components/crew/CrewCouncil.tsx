"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TryAgain } from "@/components/TryAgain";
import { httpRpc } from "@/lib/chain";
import { councilFromPolicy, readStoredCrew } from "@/lib/crew";
import { viewRequest } from "@/lib/vault";

type CrewState =
  | { kind: "reading" }
  | { kind: "empty" }
  | { kind: "loading"; account: string }
  | { kind: "ready"; account: string; members: string[] }
  | { kind: "failed"; account: string };

/** Reads a DAO id already stored on this browser, then that DAO's council. It does not write the id or send a transaction. */
export function CrewCouncil({ storageName, rpcUrl }: { storageName: string; rpcUrl: string }) {
  const [state, setState] = useState<CrewState>({ kind: "reading" });

  useEffect(() => {
    let account: string | null = null;
    try {
      account = readStoredCrew(window.localStorage, storageName);
    } catch {
      account = null;
    }
    if (!account) {
      setState({ kind: "empty" });
      return;
    }
    const dao = account;
    if (!rpcUrl) {
      setState({ kind: "failed", account: dao });
      return;
    }
    setState({ kind: "loading", account: dao });
    const rpc = httpRpc(rpcUrl, fetch, { signal: AbortSignal.timeout(20_000) });
    let cancel = false;
    rpc(viewRequest(dao, "get_policy", {})).then((result) => {
      if (cancel) return;
      const council = result.ok ? councilFromPolicy(result.value) : { ok: false as const };
      if (!council.ok) {
        setState({ kind: "failed", account: dao });
        return;
      }
      setState({ kind: "ready", account: dao, members: council.members });
    });
    return () => {
      cancel = true;
    };
  }, [rpcUrl, storageName]);

  if (state.kind === "reading" || state.kind === "loading") {
    return (
      <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
        <div className="mx-auto max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Crew</p>
          <h1 className="mt-2 break-all font-mono text-2xl leading-tight">{state.kind === "loading" ? state.account : "Crew"}</h1>
          <p className="mt-3 text-sm text-chalk/70">{state.kind === "loading" ? "Reading the crew." : "Reading this browser."}</p>
        </div>
      </main>
    );
  }

  if (state.kind === "empty") {
    return (
      <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
        <div className="mx-auto max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Crew</p>
          <h1 className="mt-2 font-sign text-3xl leading-tight">No crew is stored.</h1>
          <p className="mt-3 text-sm text-chalk/70">A crew is a DAO. None is connected to this device.</p>
          <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Back to the door
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Crew</p>
        <h1 className="mt-2 break-all font-mono text-2xl leading-tight">{state.account}</h1>
        <p className="mt-3 text-sm text-chalk/70">The vault pays this account.</p>
        {state.kind === "failed" ? (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <p className="text-sm text-chalk/70">The crew could not be read.</p>
            <TryAgain href="/crew" />
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {state.members.map((member) => (
              <li key={member} className="break-all rounded-2xl border border-white/10 bg-night-2 px-4 py-3 font-mono text-sm">
                {member}
              </li>
            ))}
          </ul>
        )}
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}
