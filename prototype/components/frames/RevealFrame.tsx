import { SiteNav } from "@/components/SiteNav";
import { NetworkTag } from "@/components/bits";
import { CloseTime, Countdown } from "@/components/Countdown";
import { TryAgain } from "@/components/TryAgain";
import { TokenAmount } from "@/components/TokenAmount";
import { doorPaths } from "@/lib/door-read";
import { CLOSE_NS, HASH, LEDGER, TOKEN, doorSpec, frontId } from "@/lib/demo/world";

/** The ledger page. An open round shows the countdown and the commitment. A closed round shows the lines. */
export function RevealFrame({ query }: { query: Record<string, string> }) {
  const spec = doorSpec(query.id || frontId()) ?? doorSpec(frontId())!;
  const paths = doorPaths(spec.id);
  const state = query.state || (spec.kind === "never" ? "never" : "open");
  const round = state === "never" ? "0" : "1";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Round {round}</p>
          <NetworkTag label="Testnet" className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">{state === "never" ? "Not opened yet" : state === "open" ? "Tonight\u2019s ledger" : `Round ${round} ledger`}</h1>
        {state === "never" ? <p className="mt-4 text-sm text-chalk/70">This door has not opened a round yet, so there is no ledger.</p> : null}
        {state === "open" ? (
          <>
            <p className="mt-4 text-sm text-chalk/70">The ledger opens when this round closes.</p>
            <section aria-label="When the ledger opens" className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">Opens in</p>
              <Countdown endsAtNs={CLOSE_NS} className="mt-1 block font-mono text-4xl text-chalk" />
              <CloseTime endsAtNs={CLOSE_NS} className="mt-1 block text-sm text-chalk/60" />
              <ol className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
                <li className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2"><span className="font-sign text-[#ff6b7e]">1</span><span><span className="font-sign">Committed.</span> <span className="text-chalk/70">The door locked its list before it opened, so it cannot change it now.</span></span></li>
                <li className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2"><span className="font-sign text-[#ff6b7e]">2</span><span><span className="font-sign">Revealed.</span> <span className="text-chalk/70">At close, a player who raided sees every bill on their list and which were already paid.</span></span></li>
                <li className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2"><span className="font-sign text-[#ff6b7e]">3</span><span><span className="font-sign">Checked.</span> <span className="text-chalk/70">The page recomputes the list&apos;s hash and compares it with the one committed on chain.</span></span></li>
              </ol>
              <p className="mt-4 break-all font-mono text-[11px] text-chalk/50">Committed hash · {HASH}</p>
            </section>
          </>
        ) : null}
        {state === "none" ? <p className="mt-4 text-sm text-chalk/70">No raid is stored on this device. The ledger is shown only to the player who raided this door, with the passkey that raided it. Anyone can check the door&apos;s commitment hash against it.</p> : null}
        {state === "failed" ? (
          <>
            <p className="mt-4 text-sm text-chalk/70">The door did not answer. The ledger stays shut.</p>
            <div className="mt-4"><TryAgain href={paths.reveal} /></div>
          </>
        ) : null}
        {state === "lines" ? (
          <ul className="mt-5 space-y-2">
            {LEDGER.map((line) => (
              <li key={`${line.payee}-${line.reference}`} className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-sign">{line.payee}</span>
                  <TokenAmount token={TOKEN} atomic={line.total} className="text-sm" />
                </div>
                <p className="mt-1 font-mono text-[11px] text-chalk/50">{line.reference} · {line.item} · {line.paid ? "paid" : "open"}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {state === "lines" ? <p className="mt-6 text-sm text-chalk/60">This round is over.</p> : null}
        <a href={paths.door} className="chalk-focus mt-6 inline-flex min-h-11 items-center rounded-2xl border border-chalk/30 px-4 text-sm text-chalk/90">Back to this door</a>
      </div>
    </main>
  );
}
