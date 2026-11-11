"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { NetworkTag } from "@/components/bits";
import { TokenAmount } from "@/components/TokenAmount";
import type { TokenRead } from "@/lib/page-vault";
import { parseCrack, type CrackView } from "@/lib/vault";
import { checkWin, crackKey, listWins, rpcCaller, viewCall, type CheckRow, type WinCheck, type WinRow } from "@/lib/win-check";

type Win = WinRow & { crack: CrackView | null };
type Load = { state: "reading" } | { state: "failed" } | { state: "ready"; wins: Win[] };

const LABEL: Record<CheckRow["id"], string> = {
  recorded: "Recorded by the vault",
  receipt: "Found the call that recorded it",
  matches: "Matches what was signed",
  signature: "Signed by the guard",
};

const BADGE: Record<CheckRow["status"], { word: string; tone: string }> = {
  ok: { word: "Checked", tone: "border-uv/50 text-chalk" },
  bad: { word: "Does not match", tone: "border-rope/60 text-chalk" },
  unchecked: { word: "Not checked", tone: "border-white/15 text-chalk/70" },
};

// CrackStatus in contracts/vault/src/state.rs.
const STATUS: Record<string, string> = {
  Reserved: "Waiting to be claimed",
  Pending: "Payout in progress",
  Paid: "Paid",
  Failed: "Payout failed",
  Expired: "Not claimed in 7 days, back in the pot",
  Recorded: "Recorded",
  Settled: "Settled",
};

function when(ns: string): string {
  const ms = Number(BigInt(ns) / 1_000_000n);
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZoneName: "short" });
}

/**
 * Plan 82. Every check runs in this browser against a public NEAR node. The page holds no data of its own and
 * does not call the Bouncer server, so what it ticks is what the chain says.
 */
export function WinsBoard({
  vaultId,
  sign,
  guardPk,
  contractId,
  rpcUrl,
  archivalRpcUrl,
  networkTag,
  token,
  doorHref,
  focus,
}: {
  vaultId: string;
  sign: string;
  guardPk: string | null;
  contractId: string;
  rpcUrl: string;
  archivalRpcUrl: string | null;
  networkTag: string;
  token: Promise<TokenRead>;
  doorHref: string;
  focus: { round: number; raidId: string } | null;
}) {
  const call = useMemo(() => rpcCaller(rpcUrl, archivalRpcUrl), [rpcUrl, archivalRpcUrl]);
  const [load, setLoad] = useState<Load>({ state: "reading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoad({ state: "reading" });
    void (async () => {
      const listed = await listWins(call, contractId, vaultId);
      if (!listed.ok) {
        if (!cancel) setLoad({ state: "failed" });
        return;
      }
      const wins = await Promise.all(
        listed.wins.map(async (row): Promise<Win> => {
          const read = await viewCall(call, contractId, "get_crack", { vault_id: vaultId, round: row.round, raid_id: row.raidId });
          const parsed = read.ok ? parseCrack(read.value) : null;
          return { ...row, crack: parsed?.ok ? parsed.crack : null };
        }),
      );
      if (!cancel) setLoad({ state: "ready", wins: wins.reverse() });
    })();
    return () => {
      cancel = true;
    };
  }, [call, contractId, vaultId, attempt]);

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">{sign}</p>
          <NetworkTag label={networkTag} className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Wins at this door</h1>
        <p className="mt-4 text-sm text-chalk/70">
          Every win this door has recorded. Check one and this page reads the chain itself: the vault&apos;s record, the call that wrote it, and the guard&apos;s signature. Nothing here comes from the Bouncer server, and no bill is shown.
        </p>

        {load.state === "reading" && <p className="mt-6 text-sm text-chalk/70" role="status">Reading the vault&apos;s wins…</p>}
        {load.state === "failed" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="text-sm">The wins could not be read from the chain.</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="chalk-focus mt-3 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm">
              Try again
            </button>
          </div>
        )}
        {/* A link to one win that this door does not hold says so, instead of quietly showing the list. */}
        {load.state === "ready" && focus && !load.wins.some((win) => win.round === focus.round && win.raidId === focus.raidId) && (
          <p className="mt-6 rounded-3xl border border-rope/40 bg-night-2 p-5 text-sm" role="status">This door has no recorded win for that link (round {focus.round}). Every win it holds is listed below.</p>
        )}
        {load.state === "ready" && load.wins.length === 0 && <p className="mt-6 text-sm text-chalk/70">No win has been recorded at this door yet.</p>}
        {load.state === "ready" && load.wins.length > 0 && (
          <ul className="mt-6 flex flex-col gap-4">
            {load.wins.map((win) => (
              <WinCard
                key={`${win.round}-${win.raidId}`}
                win={win}
                guardPk={guardPk}
                contractId={contractId}
                rpcUrl={archivalRpcUrl ?? rpcUrl}
                call={call}
                token={token}
                focused={focus?.round === win.round && focus.raidId === win.raidId}
              />
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href={doorHref} className="chalk-focus inline-flex min-h-11 items-center underline decoration-white/20">
            The door
          </Link>
          <Link href="/how-it-works#hiw-5" className="chalk-focus inline-flex min-h-11 items-center underline decoration-white/20">
            What these checks mean
          </Link>
        </div>
      </div>
    </main>
  );
}

function WinCard({
  win,
  guardPk,
  contractId,
  rpcUrl,
  call,
  token,
  focused,
}: {
  win: Win;
  guardPk: string | null;
  contractId: string;
  rpcUrl: string;
  call: ReturnType<typeof rpcCaller>;
  token: Promise<TokenRead>;
  focused: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [result, setResult] = useState<WinCheck | "checking" | null>(null);
  const [copied, setCopied] = useState(false);
  const crack = win.crack;

  async function run() {
    if (!crack) return;
    setResult("checking");
    setResult(await checkWin({ key: win, crack, guardPk, contractId, call }));
  }

  useEffect(() => {
    if (!focused || !crack) return;
    ref.current?.scrollIntoView({ block: "center" });
    void run();
    // Only on first focus; a later click re-runs on its own.
  }, [focused, crack]);

  const commands =
    result && result !== "checking" && result.receiptId
      ? [
          `# The receipt that recorded this win, with the signed verdict in its arguments`,
          `curl -s ${rpcUrl} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"EXPERIMENTAL_receipt","params":{"receipt_id":"${result.receiptId}"}}'`,
          `# The storage change it made, at block ${result.block}`,
          `curl -s ${rpcUrl} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"EXPERIMENTAL_changes","params":{"block_id":${result.block},"changes_type":"data_changes","account_ids":["${contractId}"],"key_prefix_base64":"${crackKey(win)}"}}'`,
        ]
      : [];

  return (
    <li ref={ref} className={`rounded-3xl border bg-night-2 p-5 ${focused ? "border-uv/60" : "border-white/10"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-sign text-xl">Round {win.round}</p>
        {crack ? <TokenAmount token={token} atomic={crack.amount} className="font-mono text-lg" /> : null}
      </div>
      {crack ? (
        <p className="mt-1 text-sm text-chalk/70">
          {STATUS[crack.status] ?? crack.status} · recorded {when(crack.recordedAt)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-chalk/70">This win&apos;s record could not be read.</p>
      )}
      <p className="mt-1 break-all font-mono text-xs text-chalk/50">Raid {win.raidId}</p>

      {crack && result === null && (
        <button type="button" onClick={() => void run()} className="chalk-focus mt-4 min-h-11 rounded-2xl bg-chalk px-4 font-sign text-ink">
          Check this win
        </button>
      )}
      {result === "checking" && (
        <p className="mt-4 text-sm text-chalk/70" role="status">
          Reading the chain…
        </p>
      )}
      {result && result !== "checking" && (
        <>
          <ul className="mt-4 flex flex-col gap-3" aria-label={`Checks for round ${win.round}`}>
            {result.rows.map((row) => (
              <li key={row.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${BADGE[row.status].tone}`}>{BADGE[row.status].word}</span>
                  <span className="font-medium">{LABEL[row.id]}</span>
                </div>
                <p className="mt-1 text-chalk/70">{row.detail}</p>
              </li>
            ))}
          </ul>
          {commands.length > 0 && (
            <details className="mt-3">
              <summary className="chalk-focus min-h-11 cursor-pointer py-2 text-sm text-chalk/80">Check it yourself</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-night p-3 font-mono text-xs text-chalk/80">{commands.join("\n")}</pre>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(commands.join("\n")).then(() => setCopied(true), () => setCopied(false));
                }}
                className="chalk-focus mt-2 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm"
              >
                {copied ? "Copied" : "Copy the commands"}
              </button>
            </details>
          )}
          <button type="button" onClick={() => void run()} className="chalk-focus mt-2 min-h-11 text-sm text-chalk/70 underline decoration-white/20">
            Check again
          </button>
        </>
      )}
    </li>
  );
}
