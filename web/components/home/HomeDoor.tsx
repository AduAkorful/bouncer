import Link from "next/link";
import type { ReactNode } from "react";
import { Countdown } from "@/components/Countdown";
import { NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { StreetScroll } from "@/components/home/StreetScroll";
import { TokenAmount, TokenPotGlyph } from "@/components/TokenAmount";
import { STREET_VIEW } from "@/lib/street-setting";
import { WalletChip } from "@/components/profile/ProfileWallet";
import { cardLook, type Card } from "@/lib/card";
import { SceneLife } from "@/components/SceneLife";
import { CLOSED_DOOR_NOTE, COMMITMENT_LINE, NO_COMMITMENT, commitmentFooter, doorShut, doorTitle } from "@/lib/door";
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
  vaultId,
  networkTag,
  notice,
  card = null,
  base = "",
  token,
  doors,
  wallet,
}: {
  vault: VaultView | null;
  /** This vault's id. It is the sign when the vault has no card. */
  vaultId: string;
  networkTag?: string;
  notice?: string;
  /** A sponsor's public card. Null when this vault has none. */
  card?: Card | null;
  /** This door's own URL, `/v/<id>`. Play, reveal, and claim hang off it. */
  base?: string;
  token: Promise<TokenRead>;
  /** The other-doors list, including its own loading state. */
  doors: ReactNode;
  /** Chain names for the signed-in balance. Absent when the page has no public env. */
  wallet?: { rpcUrl: string; contractId: string; networkId: string; storageName: string } | null;
}) {
  const title = doorTitle(card, vaultId);
  const shut = vault ? doorShut(vault, Date.now()) : false;
  const phase = !vault ? "closed" : shut ? "closed" : vault.crackCount > 0 ? "cracked" : "open";
  const atomic = vault ? (phase === "cracked" || vault.open ? vault.dayPot : vault.pot) : null;
  const commitment = commitmentFooter(vault?.commitment);
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 text-chalk">
      <a
        href="#door"
        className="chalk-focus sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-night focus:px-4 focus:py-3 focus:text-sm focus:text-chalk"
      >
        Skip to the door
      </a>
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3 sm:absolute sm:inset-x-0 sm:top-0 sm:flex-nowrap">
        <Link href="/" className="chalk-focus order-1 inline-flex min-h-11 items-center font-sign text-lg drop-shadow">
          BOUNCER
        </Link>
        <div className="order-3 flex w-full items-center gap-1.5 sm:order-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-2">
          <NetworkTag label={networkTag} className="whitespace-nowrap bg-black/40 text-chalk/80 backdrop-blur" />
          <span className="cursor-default select-none font-mono text-xs text-chalk/80">Queue</span>
          {vault ? <span className="font-mono text-xs text-chalk/80">{vault.crackCount} in</span> : null}
        </div>
        <div className="order-2 flex items-center gap-1.5 sm:order-3">
          <Link href="/sponsors" className="chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur">
            Sponsor
          </Link>
          <Link href="/fame" className="chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur">
            Hall of fame
          </Link>
          <Link href="/profile" className="chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur">
            Profile
          </Link>
        </div>
      </header>

      <section className="relative h-[46dvh] min-h-[280px] bg-[#1a1424] sm:h-[70dvh] sm:min-h-[420px]">
        <StreetScroll>
          <SceneLife className="absolute inset-0">
            <DoorScene
              sign={title.sign}
              look={card ? cardLook(card) : undefined}
              setting={card?.setting}
              neighbors
              open={phase === "cracked"}
              p="home"
              viewBox={STREET_VIEW}
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
        </StreetScroll>
        <p className="pointer-events-none absolute bottom-5 left-4 font-mono text-[10px] text-chalk/70 lg:hidden">Swipe the street</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <section id="door" tabIndex={-1} className="relative z-10 mx-auto -mt-6 max-w-lg scroll-mt-6 px-4 outline-none">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl">
          <h1 className="font-sign text-3xl leading-none">{title.sign}</h1>
          <div className="mt-3 flex items-center justify-between gap-3">
            {title.name ? <span className="shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{title.name.toUpperCase()}</span> : <span />}
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
          <p className="mt-3 font-sign text-xl leading-tight sm:text-2xl">{notice ?? (card?.pitch || phaseCopy[phase].line)}</p>
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
          {wallet ? <WalletChip {...wallet} /> : null}
          <p className="mt-3 text-center text-sm text-chalk/60">{vault ? phaseCopy[phase].note : "Nothing on this door was filled in."}</p>
          <p className="mt-3 text-center text-xs leading-relaxed text-chalk/70">Test tokens have no cash value. Playing costs no money.</p>
          <p className="text-center">
            <Link href="/sponsors" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
              Sponsor a door
            </Link>
            <Link href="/fame" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
              Hall of fame
            </Link>
          </p>
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
        {"hash" in commitment ? (
          <p className="break-words">
            <span className="text-uv-glow">●</span> {COMMITMENT_LINE} · <span className="break-all">{commitment.hash}</span>
          </p>
        ) : (
          <p>{NO_COMMITMENT}</p>
        )}
      </footer>
    </main>
  );
}
