import Link from "next/link";
import type { ReactNode } from "react";
import { Countdown } from "@/components/Countdown";
import { NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { TokenAmount, TokenPotGlyph } from "@/components/TokenAmount";
import { cardLook, type Card } from "@/lib/card";
import { SceneLife } from "@/components/SceneLife";
import { CLOSED_DOOR_NOTE, doorShut } from "@/lib/door";
import type { TokenRead } from "@/lib/page-vault";
import type { VaultView } from "@/lib/vault";

const phaseCopy = {
  open: {
    line: "One of my payees changed bank details tonight. Think you can get past me?",
    note: "Six messages, including bills · Street talk is free",
  },
  cracked: {
    line: "People got in. The ledger stays shut until this round closes.",
    note: "Six messages, including bills · Street talk is free",
  },
  closed: {
    line: "Last call is over. The door is shut.",
    note: CLOSED_DOOR_NOTE,
  },
} as const;

export function HomeDoor({
  vault,
  networkTag,
  notice,
  card = null,
  base = "",
  token,
  doors,
}: {
  vault: VaultView | null;
  networkTag?: string;
  notice?: string;
  /** A sponsor's public card. Null for a built-in door. */
  card?: Card | null;
  /** Where this door's pages live: empty for the default vault, `/v/<id>` for a sponsor's. */
  base?: string;
  token: Promise<TokenRead>;
  /** The other-doors list, including its own loading state. */
  doors: ReactNode;
}) {
  const shut = vault ? doorShut(vault, Date.now()) : false;
  const phase = !vault ? "closed" : shut ? "closed" : vault.crackCount > 0 ? "cracked" : "open";
  const atomic = vault ? (phase === "cracked" || vault.open ? vault.dayPot : vault.pot) : null;
  const commitment = vault?.commitment;
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 text-chalk">
      <a
        href="#door"
        className="chalk-focus sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-night focus:px-4 focus:py-3 focus:text-sm focus:text-chalk"
      >
        Skip to the door
      </a>
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3 sm:absolute sm:inset-x-0 sm:top-0 sm:flex-nowrap">
        <span className="order-1 font-sign text-lg drop-shadow">BOUNCER</span>
        <div className="order-3 flex w-full items-center gap-1.5 sm:order-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-2">
          <NetworkTag label={networkTag} className="whitespace-nowrap bg-black/40 text-chalk/80 backdrop-blur" />
          <span className="cursor-default select-none font-mono text-xs text-chalk/80">Queue</span>
          {vault ? <span className="font-mono text-xs text-chalk/80">{vault.crackCount} in</span> : null}
        </div>
        <Link href="/profile" className="chalk-focus order-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur sm:order-3">
          Profile
        </Link>
      </header>

      <section className="relative h-[46dvh] min-h-[280px] bg-[#1a1424] sm:h-[70dvh] sm:min-h-[420px]">
        <SceneLife className="absolute inset-0">
          <DoorScene
            sign={card?.sign ?? "THE VELVET"}
            look={card ? cardLook(card) : undefined}
            neighbors={false}
            open={phase === "cracked"}
            p="home"
            viewBox="80 0 292 244"
            lampFigureX={356}
            className="size-full"
            back={
              <g aria-hidden>
                <text x="134" y="128" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="6" fill="#efe8da" opacity="0.7">
                  IN
                </text>
                <g stroke="#efe8da" strokeWidth="1.4" opacity="0.8">
                  {Array.from({ length: vault?.crackCount ?? 0 }, (_, i) => (
                    <line key={i} x1={124 + i * 3.5} y1="132" x2={124 + i * 3.5} y2="144" />
                  ))}
                </g>
              </g>
            }
            front={
              <g aria-label="Tonight's pot">
                <path d="M282,224 L290,166 M330,224 L322,166" stroke="#5a4630" strokeWidth="3" />
                <rect x="281" y="156" width="50" height="58" rx="3" fill="#1b2420" stroke="#5a4630" strokeWidth="3" />
                <g transform="rotate(-3 306 185)">
                  <text x="306" y="170" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" letterSpacing="0.3" fill="#efe8da" opacity="0.85">
                    TONIGHT&apos;S POT
                  </text>
                  {atomic ? <TokenPotGlyph token={token} atomic={atomic} /> : null}
                </g>
              </g>
            }
          />
        </SceneLife>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <section id="door" tabIndex={-1} className="relative z-10 mx-auto -mt-6 max-w-lg scroll-mt-6 px-4 outline-none">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl">
          <h1 className="font-sign text-3xl leading-none">{card?.sign ?? "THE VELVET"}</h1>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{card ? card.name.toUpperCase() : "BIG SAM"}</span>
            {vault ? <span className="text-right font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Round {vault.round}</span> : null}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">
                {vault ? (phase === "cracked" ? "Splitting now" : phase === "closed" ? "Closed" : "Tonight's pot") : "No vault"}
              </div>
              {atomic ? <TokenAmount token={token} atomic={atomic} className="text-2xl text-brass" /> : <p className="text-sm text-chalk/60">No pot is stored.</p>}
            </div>
            {vault && !shut ? (
              <div className="text-right">
                <div className="font-mono text-xs uppercase tracking-wider text-chalk/80">Closes</div>
                <Countdown endsAtNs={vault.closesAt} className="text-chalk" />
              </div>
            ) : null}
          </div>
          <p className="mt-3 font-sign text-xl leading-tight sm:text-2xl">{notice ?? (card ? card.pitch : phaseCopy[phase].line)}</p>
          {vault && !shut ? (
            <a
              href={`${base}/play`}
              className="chalk-focus mt-5 block rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
            >
              Join the queue
            </a>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 py-4 text-center font-sign text-xl text-chalk/50">
              {vault ? "The queue is closed" : "The queue is not open"}
            </p>
          )}
          <p className="mt-3 text-center text-sm text-chalk/60">{vault ? phaseCopy[phase].note : "Nothing on this door was filled in."}</p>
          <p className="mt-3 text-center text-xs leading-relaxed text-chalk/70">Test tokens have no cash value. Playing costs no money.</p>
          <p className="text-center">
            <Link href="/#how-to-play" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
              How to play
            </Link>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link href={`${base}/reveal`} className="chalk-focus inline-flex min-h-11 items-center text-chalk/80 underline decoration-white/20">
              Last night&apos;s door
            </Link>
          </p>
        </div>
      </section>

      {doors}

      <footer className="mx-auto mt-8 max-w-5xl px-4 font-mono text-[11px] leading-relaxed text-chalk/50">
        {vault && shut ? null : commitment ? (
          <p className="break-words">
            <span className="text-uv-glow">●</span> Tonight&apos;s ledger committed before the door opened ·{" "}
            <span className="break-all">{commitment}</span>
          </p>
        ) : (
          <p>No commitment is stored on this vault.</p>
        )}
      </footer>
    </main>
  );
}
