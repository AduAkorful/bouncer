import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Money, NetworkTag } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { cardLook, type Card } from "@/lib/card";
import { SceneLife } from "@/components/SceneLife";
import { doorShut } from "@/lib/door";
import { formatAtomic } from "@/lib/units";
import type { VaultView } from "@/lib/vault";

const otherDoors = [
  { name: "Accra Lions FC", kind: "Club treasurer", tone: "#2c6e49", href: "/venue/lions", sign: "ACCRA LIONS", mark: "lions" },
  { name: "Osu Builders", kind: "DAO treasury", tone: "#3b4a8f", href: "/venue/builders", sign: "OSU BUILDERS", mark: "builders" },
  { name: "Kofi's Corner", kind: "Practice room", tone: "#7a5a20", href: "/practice", sign: "KOFI", mark: "kofi" },
];

const wristbands = [
  { name: "The Queue", line: "Today's door, every day", color: "#efe8da", here: true, href: "/play" },
  { name: "The Door", line: "Preview · Lions and Builders", color: "#8f6bff", here: false, href: "/venue/lions" },
  { name: "VIP", line: "Steward a sponsored vault", color: "#cfa349", here: false, href: "/vip" },
];

const phaseCopy = {
  open: {
    line: "One of my payees changed bank details tonight. Think you can get past me?",
    note: "No sign-up · messages on the door · back office tonight",
  },
  cracked: {
    line: "People got in. The pot is splitting. The list stays up until reset.",
    note: "The door is open · the ledger is still live",
  },
  closed: {
    line: "Last call is over. The door is shut.",
    note: "Reset is the next thing on this door",
  },
} as const;

export function HomeDoor({
  vault,
  currency,
  decimals,
  networkTag,
  notice,
  card = null,
  base = "",
}: {
  vault: VaultView | null;
  currency?: string;
  decimals?: number;
  networkTag?: string;
  notice?: string;
  /** A sponsor's public card. Null for a built-in door. */
  card?: Card | null;
  /** Where this door's pages live: empty for the default vault, `/v/<id>` for a sponsor's. */
  base?: string;
}) {
  const shut = vault ? doorShut(vault, Date.now()) : false;
  const phase = !vault ? "closed" : shut ? "closed" : vault.crackCount > 0 ? "cracked" : "open";
  const pot = vault && decimals !== undefined ? formatAtomic(phase === "cracked" ? vault.dayPot : vault.open ? vault.dayPot : vault.pot, decimals) : undefined;
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
        <div className="order-3 flex w-full flex-wrap items-center gap-1.5 sm:order-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-2">
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
              <g aria-label={pot ? `Tonight's pot ${pot} ${currency}` : "Tonight's pot unavailable"}>
                <path d="M282,224 L290,166 M330,224 L322,166" stroke="#5a4630" strokeWidth="3" />
                <rect x="281" y="156" width="50" height="58" rx="3" fill="#1b2420" stroke="#5a4630" strokeWidth="3" />
                <g transform="rotate(-3 306 185)">
                  <text x="306" y="170" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" letterSpacing="0.3" fill="#efe8da" opacity="0.85">
                    TONIGHT&apos;S POT
                  </text>
                  {pot ? (
                    <text x="306" y="188" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="11" fill="#f0d48f">
                      {pot}
                    </text>
                  ) : null}
                  {currency ? (
                    <text x="306" y="202" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" fill="#efe8da" opacity="0.75">
                      {currency}
                    </text>
                  ) : null}
                </g>
              </g>
            }
          />
        </SceneLife>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <section id="door" tabIndex={-1} className="relative z-10 mx-auto -mt-6 max-w-lg scroll-mt-6 px-4 outline-none">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{card ? card.name.toUpperCase() : "BIG SAM"}</span>
            {vault ? <span className="text-right font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Round {vault.round}</span> : null}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">
                {vault ? (phase === "cracked" ? "Splitting now" : phase === "closed" ? "Closed" : "Tonight's pot") : "No vault"}
              </div>
              {pot && currency ? <Money text={pot} currency={currency} className="text-2xl text-brass" /> : <p className="text-sm text-chalk/60">No pot is stored.</p>}
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
          <p className="mt-2 text-center text-sm">
            <Link href={`${base}/reveal`} className="chalk-focus inline-flex min-h-11 items-center text-chalk/80 underline decoration-white/20">
              Last night&apos;s door
            </Link>
          </p>
        </div>
      </section>

      {card ? null : (
      <div className="mx-auto mt-8 grid min-w-0 max-w-5xl gap-8 px-4 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="font-sign text-lg">Down the street</h2>
          <div className="night-scroll mt-3 flex gap-3 overflow-x-auto pb-2">
            {otherDoors.map((door) => (
              <Link key={door.name} href={door.href} className="chalk-focus w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-night-2">
                <DoorScene
                  sign={door.sign}
                  neighbors={false}
                  queue={false}
                  p={door.mark}
                  ink={{ stroke: door.tone, fill: door.tone }}
                  viewBox="104 8 192 62"
                  className="block h-16 w-full bg-[#1a1424]"
                  decorative
                />
                <div className="p-3">
                  <div className="font-sign text-sm leading-tight">{door.name}</div>
                  <div className="mt-0.5 text-xs text-chalk/60">{door.kind}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-sign text-lg">Your wristband</h2>
          <div className="mt-3 space-y-2">
            {wristbands.map((band) => (
              <Link
                key={band.name}
                href={band.href}
                className={`chalk-focus flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 ${band.here ? "border-chalk/40 bg-night-2" : "border-white/10"}`}
              >
                <span className="h-3.5 w-10 rounded-sm" style={{ background: band.color }} />
                <div className="flex-1">
                  <div className="font-sign text-sm">{band.name}</div>
                  <div className="text-xs text-chalk/60">{band.line}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      )}

      <footer className="mx-auto mt-8 max-w-5xl px-4 font-mono text-[11px] text-chalk/50">
        {vault && shut ? null : commitment ? (
          <span>
            <span className="text-uv-glow">●</span> Tonight&apos;s ledger committed before the door opened · {commitment}
          </span>
        ) : (
          <span>No commitment is stored on this vault.</span>
        )}
      </footer>
    </main>
  );
}
