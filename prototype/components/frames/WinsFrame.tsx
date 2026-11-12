"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { NetworkTag } from "@/components/bits";
import { TokenAmount } from "@/components/TokenAmount";
import { REAL_WIN, TOKEN, doorSpec, frontId } from "@/lib/demo/world";
import { doorPaths } from "@/lib/door-read";

type Status = "ok" | "bad" | "unchecked";
type CheckRow = { id: "recorded" | "receipt" | "matches" | "signature"; status: Status; detail: string };

// Copied from WinsBoard.tsx.
const LABEL: Record<CheckRow["id"], string> = {
  recorded: "Recorded by the vault",
  receipt: "Found the call that recorded it",
  matches: "Matches what was signed",
  signature: "Signed by the guard",
};

const BADGE: Record<Status, { word: string; tone: string }> = {
  ok: { word: "Checked", tone: "border-uv/50 text-chalk" },
  bad: { word: "Does not match", tone: "border-rope/60 text-chalk" },
  unchecked: { word: "Not checked", tone: "border-white/15 text-chalk/70" },
};

/**
 * The real skyline-social win (REAL_WIN): its raid id, receipt, block and the rows the live page gave for it on
 * 11 Nov 2026. The checks are not run here; the prototype does not fetch.
 */
const WIN = {
  round: 1,
  raidId: "516828955b50896226a3a18762107841",
  recordedAtMs: 1794410612406,
  receiptId: "i7eva68egxJqaWKCsuqWag8cw9TrpAhY7xVRGb4CQYW",
  block: 277233423,
  crackKey: "AQ4AAABza3lsaW5lLXNvY2lhbAEAAAAAAAAAIAAAADUxNjgyODk1NWI1MDg5NjIyNmEzYTE4NzYyMTA3ODQx",
};

const ROWS: CheckRow[] = [
  { id: "recorded", status: "ok", detail: "The vault holds this win: Paid." },
  { id: "receipt", status: "ok", detail: "Found the submit_verdict call, sent by relay.aduakorful.testnet." },
  { id: "matches", status: "ok", detail: "Every signed field equals what the vault stored." },
  { id: "signature", status: "ok", detail: "The signature is the guard key's. Checked in this browser." },
];

const RPC = "https://archival-rpc.testnet.fastnear.com";

export function WinsFrame({ query }: { query: Record<string, string> }) {
  const spec = doorSpec(query.id || frontId()) ?? doorSpec(frontId())!;
  const paths = doorPaths(spec.id);
  const state = query.state || (query.raid ? "checked" : "list");
  const missing = state === "missing";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">{spec.sign}</p>
          <NetworkTag label="Testnet" className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Wins at this door</h1>
        <p className="mt-4 text-sm text-chalk/70">
          Every win this door has recorded. Check one and this page reads the chain itself: the vault&apos;s record, the call that wrote it, and the guard&apos;s signature. Nothing here comes from the Bouncer server, and no bill is shown.
        </p>

        {state === "reading" && <p className="mt-6 text-sm text-chalk/70" role="status">Reading the vault&apos;s wins…</p>}
        {state === "failed" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="text-sm">The wins could not be read from the chain.</p>
            <a href={`${paths.wins}&state=list`} className="chalk-focus mt-3 inline-flex min-h-11 items-center rounded-2xl border border-chalk/30 px-4 text-sm">Try again</a>
          </div>
        )}
        {missing && (
          <p className="mt-6 rounded-3xl border border-rope/40 bg-night-2 p-5 text-sm" role="status">This door has no recorded win for that link (round 2). Every win it holds is listed below.</p>
        )}
        {state === "empty" && <p className="mt-6 text-sm text-chalk/70">No win has been recorded at this door yet.</p>}
        {state === "list" || state === "checking" || state === "checked" || missing ? <ul className="mt-6 flex flex-col gap-4"><WinCard state={missing ? "list" : state} winsHref={paths.wins} /></ul> : null}

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href={paths.door} className="chalk-focus inline-flex min-h-11 items-center underline decoration-white/20">The door</Link>
          <Link href="/frames/how-it-works#hiw-5" className="chalk-focus inline-flex min-h-11 items-center underline decoration-white/20">What these checks mean</Link>
        </div>
      </div>
    </main>
  );
}

function WinCard({ state, winsHref }: { state: string; winsHref: string }) {
  const [copied, setCopied] = useState(false);
  const focused = state === "checked" || state === "checking";
  const commands = [
    `# The receipt that recorded this win, with the signed verdict in its arguments`,
    `curl -s ${RPC} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"EXPERIMENTAL_receipt","params":{"receipt_id":"${WIN.receiptId}"}}'`,
    `# The storage change it made, at block ${WIN.block}`,
    `curl -s ${RPC} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"EXPERIMENTAL_changes","params":{"block_id":${WIN.block},"changes_type":"data_changes","account_ids":["${REAL_WIN.contract}"],"key_prefix_base64":"${WIN.crackKey}"}}'`,
  ];
  const recorded = new Date(WIN.recordedAtMs).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: "UTC" });
  return (
    <li className={`rounded-3xl border bg-night-2 p-5 ${focused ? "border-uv/60" : "border-white/10"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-sign text-xl">Round {WIN.round}</p>
        <TokenAmount token={TOKEN} atomic={REAL_WIN.amount} className="font-mono text-lg" />
      </div>
      <p className="mt-1 text-sm text-chalk/70">Paid · recorded {recorded}</p>
      <p className="mt-1 break-all font-mono text-xs text-chalk/50">Raid {WIN.raidId}</p>
      {state === "list" ? (
        <a href={`${winsHref}&state=checking`} className="chalk-focus mt-4 inline-flex min-h-11 items-center rounded-2xl bg-chalk px-4 font-sign text-ink">Check this win</a>
      ) : null}
      {state === "checking" ? <p className="mt-4 text-sm text-chalk/70" role="status">Reading the chain…</p> : null}
      {state === "checked" ? (
        <>
          <ul className="mt-4 flex flex-col gap-3" aria-label={`Checks for round ${WIN.round}`}>
            {ROWS.map((row) => (
              <li key={row.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${BADGE[row.status].tone}`}>{BADGE[row.status].word}</span>
                  <span className="font-medium">{LABEL[row.id]}</span>
                </div>
                <p className="mt-1 text-chalk/70">{row.detail}</p>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="chalk-focus min-h-11 cursor-pointer py-2 text-sm text-chalk/80">Check it yourself</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-night p-3 font-mono text-xs text-chalk/80">{commands.join("\n")}</pre>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(commands.join("\n")).then(() => setCopied(true), () => setCopied(false))} className="chalk-focus mt-2 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm">
              {copied ? "Copied" : "Copy the commands"}
            </button>
          </details>
          <a href={`${winsHref}&state=checking`} className="chalk-focus mt-2 inline-flex min-h-11 items-center text-sm text-chalk/70 underline decoration-white/20">Check again</a>
        </>
      ) : null}
    </li>
  );
}
