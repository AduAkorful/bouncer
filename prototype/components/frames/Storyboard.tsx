import { ACTS, STORY } from "@/lib/demo/frames";
import { REAL_WIN } from "@/lib/demo/world";

/** The video, as a story: each act's beat, then its shots with the caption on screen. Each shot opens a frame that is already in the prototype; the paid shot carries a real testnet payment. */
export function Storyboard() {
  let n = 0;
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Storyboard</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">One night at Skyline Social.</h1>
        <p className="mt-3 text-sm text-chalk/70">A player misses, finds the clue that explains it, and gets in on the last message. Each shot opens a frame that is already in the prototype; the big line is the caption on screen.</p>
        {ACTS.map((act) => (
          <section key={act.name} className="mt-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-brass">{act.name}</h2>
            <p className="mt-1 text-sm text-chalk/70">{act.beat}</p>
            <ol className="mt-3 space-y-3">
              {STORY.filter((shot) => shot.act === act.name).map((shot) => {
                n += 1;
                return (
                  <li key={`${shot.href}-${shot.title}`} className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
                    <a href={shot.href} className="chalk-focus block">
                      <span className="font-mono text-xs text-chalk/60">{String(n).padStart(2, "0")}</span>
                      <span className="ml-2 font-mono text-xs uppercase tracking-[0.16em] text-chalk/60">{shot.title}</span>
                      <span className="mt-1 block font-sign text-xl leading-tight">{shot.line}</span>
                      <span className="mt-1 block text-sm text-chalk/70">{shot.note}</span>
                    </a>
                    {shot.hash ? (
                      <p className="mt-2 break-all font-mono text-xs text-brass">
                        Payment {REAL_WIN.claimTx} · {REAL_WIN.vaultId} round {REAL_WIN.round} on {REAL_WIN.contract}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
