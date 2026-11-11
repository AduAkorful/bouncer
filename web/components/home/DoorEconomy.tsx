import { TokenAmount } from "@/components/TokenAmount";
import { doorEconomy } from "@/lib/door-economy";
import type { TokenRead } from "@/lib/page-vault";
import type { VaultView } from "@/lib/vault";

/** Plan 81. Where this door's money is right now, read from the vault. No history: the vault keeps none. */
export function DoorEconomy({ vault, shut, token }: { vault: VaultView; shut: boolean; token: Promise<TokenRead> }) {
  const economy = doorEconomy(vault, shut);
  return (
    <section aria-labelledby="door-money" className="mx-auto mt-6 max-w-lg px-4 lg:max-w-5xl">
      <div className="rounded-3xl border border-white/10 p-5 lg:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="door-money" className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Where the money is</h2>
          <p className="font-mono text-[11px] text-chalk/50">Read live from the vault contract</p>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {economy.tiles.map((tile) => (
            <div key={tile.id} className="rounded-2xl bg-night-2 px-4 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-chalk/70">{tile.label}</dt>
              <dd>
                <TokenAmount token={token} atomic={tile.atomic} className="text-xl text-brass" />
                <p className="mt-1 text-xs leading-snug text-chalk/60">{tile.note}</p>
              </dd>
            </div>
          ))}
        </dl>
        {economy.cracks ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-chalk/75">
            <span>Up to</span>
            <TokenAmount token={token} atomic={economy.cracks.capAtomic} className="text-sm text-chalk" />
            <span>
              per win · {economy.cracks.taken} of {economy.cracks.max} {economy.cracks.max === 1 ? "win" : "wins"} taken this round
            </span>
          </div>
        ) : null}
        <ol className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-sm text-chalk/70 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {economy.steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-2">
              <span className="font-sign text-brass">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
