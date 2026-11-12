import Link from "next/link";
import type { ReactNode } from "react";
import { CloseTime, Countdown } from "@/components/Countdown";
import { NetworkTag } from "@/components/bits";
import { RULES } from "@/lib/rules";
import { DoorAction } from "@/components/home/DoorAction";
import { DoorScene } from "@/components/DoorScene";
import { StreetScroll } from "@/components/home/StreetScroll";
import { TokenAmount, TokenPotGlyph } from "@/components/TokenAmount";
import { ACCRA_SETTING, STREET_VIEW, streetPieces } from "@/lib/street-setting";
import { PotBoard } from "@/components/home/PotBoard";
import { cardLook, type Card } from "@/lib/card";
import { SoundToggle } from "@/components/home/SoundToggle";
import { HelpButton } from "@/components/help/HelpButton";
import { DoorEconomy } from "@/components/home/DoorEconomy";
import { SceneLife } from "@/components/SceneLife";
import { CLOSED_DOOR_NOTE, COMMITMENT_LINE, NO_COMMITMENT, commitmentFooter, doorFull, doorNeverOpened, doorShut, doorTitle } from "@/lib/door";
import { doorPaths } from "@/lib/door-read";
import type { TokenRead } from "@/lib/page-vault";
import type { VaultView } from "@/lib/vault";
import { demoNowMs } from "@/lib/demo/clock";

const phaseCopy = {
  open: {
    line: "One of my payees changed bank details tonight. Think you can get past me?",
    note: "Six messages, including bills · Street talk is free",
  },
  cracked: {
    line: "People got in. The ledger stays shut until this round closes.",
    note: "Six messages, including bills · Street talk is free",
  },
  full: {
    line: "Somebody already got past me tonight. Come back when the next round opens.",
    note: "Tonight's cut is taken. The ledger opens when this round closes.",
  },
  closed: {
    line: "Last call is over. The door is shut.",
    note: CLOSED_DOOR_NOTE,
  },
  never: {
    line: "This door has not opened yet.",
    note: "Its sponsor has not opened a first round. Other doors are listed below.",
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
  revealHref,
  messageBudget,
  helpOpen = false,
  signedIn = null,
  walletAtomic = null,
  banner = null,
  finished = false,
  win = null,
  showJoinBar = false,
}: {
  vault: VaultView | null;
  /** This vault's id. It is the sign when the vault has no card. */
  vaultId: string;
  networkTag?: string;
  notice?: string;
  /** A sponsor's public card. Null when this vault has none. */
  card?: Card | null;
  /** This door's own URL. Play hangs off the frame paths. */
  base?: string;
  token: Promise<TokenRead>;
  /** The other-doors list, including its own loading state. */
  doors: ReactNode;
  revealHref?: string;
  /** Messages per raid, for the help sheet. */
  messageBudget?: number;
  /** Prototype only: open on the help sheet (`?state=help`). */
  helpOpen?: boolean;
  signedIn?: string | null;
  walletAtomic?: string | null;
  banner?: { line: string; link: string; href: string } | null;
  finished?: boolean;
  win?: { amount: string; ready: boolean; href: string } | null;
  showJoinBar?: boolean;
}) {
  const title = doorTitle(card, vaultId);
  const shut = vault ? doorShut(vault, demoNowMs()) : false;
  const ledgerHref = revealHref ?? `${base}/reveal`;
  const full = vault && !shut ? doorFull(vault) : false;
  const never = Boolean(vault && doorNeverOpened(vault));
  const phase = !vault ? "closed" : never ? "never" : shut ? "closed" : full ? "full" : vault.crackCount > 0 ? "cracked" : "open";
  // A shut door has no pot tonight, even when the chain still lists the round as open past its close.
  // A full round has nothing left to win, whatever the pot still holds for the claims.
  const atomic = vault && !shut && !full ? (phase === "cracked" || vault.open ? vault.dayPot : vault.pot) : null;
  const commitment = commitmentFooter(vault?.commitment);
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 text-chalk">
      <a
        href="#door"
        className="chalk-focus sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-night focus:px-4 focus:py-3 focus:text-sm focus:text-chalk"
      >
        Skip to the door
      </a>
      {/* One row only from 768px: at 640 (a 1280 screen at 200% zoom) the links and the tally do not fit. */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3 md:absolute md:inset-x-0 md:top-0 md:flex-nowrap">
        <Link href="/frames/landing" className="chalk-focus order-1 inline-flex min-h-11 items-center font-sign text-lg drop-shadow">
          BOUNCER
        </Link>
        <div className="order-3 flex w-full items-center gap-1.5 md:order-2 md:ml-auto md:w-auto md:flex-nowrap md:justify-end md:gap-2">
          <NetworkTag label={networkTag} className="whitespace-nowrap bg-black/40 text-chalk/80 backdrop-blur" />
          {vault && vault.crackCount > 0 ? <span className="font-mono text-xs text-chalk/80">{vault.crackCount} got in{shut ? ` in round ${vault.round}` : " tonight"}</span> : null}
        </div>
        <div className="order-2 flex items-center gap-1.5 md:order-3">
          <SoundToggle />
          <Link href="/frames/sponsors" className="chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur">
            Sponsor
          </Link>
          <Link href="/frames/fame" className="chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur">
            Hall of fame
          </Link>
          <Link href="/frames/profile" className="chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur">
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
              open={phase === "cracked" || phase === "full"}
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
              <PotBoard style={streetPieces(card?.setting ?? ACCRA_SETTING).board} title={never ? "SOON" : shut ? "CLOSED" : full ? "TAKEN" : "TONIGHT\u2019S POT"}>
                {atomic ? <TokenPotGlyph token={token} atomic={atomic} /> : null}
              </PotBoard>
            }
            />
          </SceneLife>
        </StreetScroll>
        <p className="pointer-events-none absolute bottom-5 left-4 rounded-full bg-black/60 px-2.5 py-1 font-mono text-xs text-chalk lg:hidden">Swipe the street ↔</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <section id="door" tabIndex={-1} className="relative z-10 mx-auto -mt-6 max-w-lg scroll-mt-6 lg:max-w-5xl px-4 outline-none">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8 lg:p-7">
          {/* Wide screens: the door on the left, the rules and links on the right, lined up with the door list below. */}
          <div>
          <h1 className="font-sign text-3xl leading-none">{title.sign}</h1>
          <div className="mt-3 flex items-center justify-between gap-3">
            {title.name ? <span className="shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{title.name.toUpperCase()}</span> : <span />}
            {vault ? <span className="text-right font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Round {vault.round}</span> : null}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">
                {vault ? (phase === "cracked" ? "Tonight's pot" : phase === "full" ? "Taken tonight" : phase === "closed" ? "Closed" : phase === "never" ? "Not opened yet" : "Tonight's pot") : "No vault"}
              </div>
              {atomic ? <TokenAmount token={token} atomic={atomic} className="text-2xl text-brass" /> : <p className="text-sm text-chalk/60">{full ? "Nothing left to win." : never ? "No round yet." : shut && vault ? "No pot tonight." : "No pot is stored."}</p>}
            </div>
            {vault && !shut ? (
              <div className="text-right">
                <div className="font-mono text-xs uppercase tracking-wider text-chalk/80">Closes in</div>
                <Countdown endsAtNs={vault.closesAt} className="text-chalk" />
                <CloseTime endsAtNs={vault.closesAt} className="block font-mono text-[11px] text-chalk/60" />
              </div>
            ) : null}
          </div>
          <p className="mt-3 font-sign text-xl leading-tight sm:text-2xl">{notice ?? (card?.pitch || phaseCopy[phase].line)}</p>
          {vault ? (
            <DoorAction vaultId={vaultId} round={vault.round} open={!shut && !full} full={full} token={token} win={win} banner={banner} showJoinBar={showJoinBar} finished={finished} />
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 py-4 text-center font-sign text-xl text-chalk/50">The queue is not open</p>
          )}
          {signedIn ? <p className="mt-3 text-center text-sm text-chalk/80">Signed in as {signedIn}</p> : null}
          {walletAtomic ? (
            <p className="mt-2 text-center">
              <a href="/frames/profile" className="chalk-focus inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm text-chalk/80">
                Your wallet · <TokenAmount token={token} atomic={walletAtomic} />
              </a>
            </p>
          ) : null}
          <p className="mt-3 text-center text-sm text-chalk/60">{vault ? phaseCopy[phase].note : "Nothing on this door was filled in."}</p>
          </div>
          <div className="lg:flex lg:flex-col lg:justify-center lg:gap-4 lg:border-l lg:border-white/10 lg:pl-8">
          {/* A shared link can land here first, so the rules are on the door, not only on the front page. */}
          <section aria-labelledby="door-rules" className="mt-4 rounded-2xl border border-white/10 px-4 py-3 lg:mt-0 lg:px-6 lg:py-5">
            <h2 id="door-rules" className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">How to play</h2>
            <ol className="mt-2 space-y-1.5 text-sm lg:mt-4 lg:space-y-4 lg:text-base">
              {RULES.map((rule, index) => (
                <li key={rule.title} className="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-2 lg:grid-cols-[2rem_minmax(0,1fr)] lg:gap-3">
                  <span className="font-sign text-[#ff6b7e] lg:text-3xl lg:leading-none">{index + 1}</span>
                  <span><span className="font-sign lg:text-lg">{rule.title}</span> <span className="text-chalk/70">{rule.text}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-chalk/60 lg:mt-5 lg:border-t lg:border-white/10 lg:pt-3 lg:text-sm">A wrong bill only hears &ldquo;Not approved.&rdquo; Nothing says what was wrong with it.</p>
            <HelpButton
              values={{ budget: messageBudget, lockNs: vault?.lockNs }}
              initialOpen={helpOpen}
              className="chalk-focus mt-1 inline-flex min-h-11 items-center text-sm text-chalk/85 underline decoration-white/30 lg:mt-2"
            >
              The full rules: matching a bill, getting paid, the night
            </HelpButton>
          </section>
          <p className="mt-3 text-center text-xs leading-relaxed text-chalk/70 lg:mt-0 lg:text-left">Test tokens have no cash value. Playing costs no money.</p>
          {never ? null : (
            <Link href={`${ledgerHref}`} className="chalk-focus flex min-h-11 flex-col justify-center rounded-2xl border border-white/10 px-4 py-2 transition hover:bg-white/5">
              <span className="font-sign text-sm lg:text-base">{shut && vault ? `Round ${vault.round} ledger` : "Tonight\u2019s ledger"}</span>
              <span className="text-xs text-chalk/60">{shut ? "The bills that were on the list." : "Opens to players when the round closes."}</span>
            </Link>
          )}
          <Link href={doorPaths(vaultId).wins} className="chalk-focus flex min-h-11 flex-col justify-center rounded-2xl border border-white/10 px-4 py-2 transition hover:bg-white/5">
            <span className="font-sign text-sm lg:text-base">Wins at this door</span>
            <span className="text-xs text-chalk/60">Every recorded win, checked from the chain in your browser.</span>
          </Link>
          </div>
        </div>
      </section>

      {vault ? <DoorEconomy vault={vault} shut={shut} token={token} /> : null}

      {doors}

      <footer className="mx-auto mt-8 max-w-5xl px-4 font-mono text-[11px] leading-relaxed text-chalk/50">
        {"hash" in commitment ? (
          <p className="break-words">
            <span className="text-uv-glow">●</span> {COMMITMENT_LINE} · <abbr title={commitment.hash} className="no-underline">{commitment.hash.slice(0, 8)}…{commitment.hash.slice(-6)}</abbr> <a href={`${ledgerHref}`} className="underline decoration-white/20">Your ledger opens here when the round closes</a>
          </p>
        ) : (
          <p>{NO_COMMITMENT}</p>
        )}
      </footer>
    </main>
  );
}
