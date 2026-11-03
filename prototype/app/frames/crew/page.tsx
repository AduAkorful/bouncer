"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DemoBadge, FrameNav, Money, MessageDots, NetworkTag, usd } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { Goer } from "@/components/Goer";
import { SceneLife } from "@/components/SceneLife";
import { ApprovedStamp } from "@/components/Stamp";
import { BUDGET, CREW_BILL, HISTORY, RAID_SCRIPT, ROLE_HINT, crew, splitFor, type CrewEvent, type MemberId } from "@/lib/demo/crew";
import { venue } from "@/lib/demo/raider";
import { sfx } from "@/lib/sfx";

type Stage = "raid" | "split";
type Vote = "yes" | "no" | null;

const member = (id: MemberId) => crew.members.find((m) => m.id === id)!;
// Where each crewmate stands at the rope, left to right.
const SPOT: Record<MemberId, number> = { kojo: 86, lin: 110, you: 134 };
const COUNCIL = crew.members.length;
const QUORUM = Math.floor(COUNCIL / 2) + 1;

export default function CrewFrame() {
  const root = useRef<HTMLDivElement>(null);
  const feedEnd = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("raid");
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState<MemberId | "guard" | null>(null);
  const [sent, setSent] = useState(false);
  const [opened, setOpened] = useState(false);
  const [votes, setVotes] = useState<Record<MemberId, Vote>>({ you: null, kojo: null, lin: null });
  const [paid, setPaid] = useState(0);
  const [counter, setCounter] = useState(false);
  const [shares, setShares] = useState<Record<MemberId, number>>({ you: 50, kojo: 25, lin: 25 });
  const [proposed, setProposed] = useState(false);
  const [counterVote, setCounterVote] = useState<Vote>(null);
  const [wasted, setWasted] = useState(0);
  const [miss, setMiss] = useState(false);
  const [draft, setDraft] = useState({ payee: "", reference: "", what: "", total: "" });

  const shown = RAID_SCRIPT.slice(0, step);
  const used = shown.filter((e) => e.kind === "ask").length + (sent ? 1 : 0) + wasted;
  const waitingOnYou = RAID_SCRIPT[step - 1]?.kind === "you" && !sent;
  const speaker = typing && typing !== "guard" ? typing : null;

  // The crew plays out its part; the script stops when it's your turn to send the bill.
  useEffect(() => {
    if (stage !== "raid" || step >= RAID_SCRIPT.length) return;
    const next = RAID_SCRIPT[step]!;
    const who = next.kind === "guard" ? "guard" : next.kind === "you" ? null : next.who;
    setTyping(who);
    const t = setTimeout(
      () => {
        setTyping(null);
        setStep((s) => s + 1);
        if (next.kind === "ask") sfx.chip();
        else if (next.kind === "guard") sfx.paper();
        else if (next.kind === "crew") sfx.pop();
      },
      step === 0 ? 900 : next.kind === "guard" ? 1100 : 1400,
    );
    return () => clearTimeout(t);
  }, [step, stage]);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step, sent, opened]);

  function tryBill() {
    const total = Number(draft.total);
    const ok =
      draft.payee.trim().toLowerCase() === CREW_BILL.payee.toLowerCase() &&
      draft.reference.trim().toUpperCase() === CREW_BILL.reference.toUpperCase() &&
      Number.isFinite(total) &&
      Math.abs(total - CREW_BILL.total) < 0.005 &&
      draft.what.trim().length > 2;
    if (!ok) {
      setMiss(true);
      setWasted((n) => n + 1);
      sfx.thud();
      return;
    }
    sendBill();
  }

  function sendBill() {
    setSent(true);
    sfx.chip();
    setTyping("guard");
    setTimeout(() => {
      setTyping(null);
      setOpened(true);
      sfx.clink();
      setTimeout(sfx.creak, 400);
      setTimeout(sfx.cheer, 700);
      gsap
        .timeline()
        .fromTo(".flood", { opacity: 0, scale: 0.3 }, { opacity: 0.8, scale: 2.4, duration: 1.1, ease: "power2.out" })
        .to(".flood", { opacity: 0.25, duration: 0.8 })
        .fromTo(".crew-stamp", { scale: 2.6, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.35, ease: "back.out(2)" }, 0.2)
        .to(".crew-stamp", { opacity: 0, duration: 0.4 }, 2.2);
    }, 1300);
  }

  function openSplit() {
    setStage("split");
    sfx.whoosh();
    // Kojo votes almost straight away; Lin is still in a taxi.
    setTimeout(() => {
      setVotes((v) => ({ ...v, kojo: "yes" }));
      sfx.tick();
    }, 1400);
  }

  function vote(v: Vote) {
    setVotes((x) => ({ ...x, you: v }));
    sfx.tick();
  }

  const yes = Object.values(votes).filter((v) => v === "yes").length;
  const passed = yes >= QUORUM;
  const split = splitFor(CREW_BILL.total);
  const shareSum = shares.you + shares.kojo + shares.lin;
  const counterYes = (counterVote === "yes" ? 1 : 0) + (shares.you <= 40 ? 1 : 0);

  // Once the vote passes, the DAO runs one transfer per member.
  useEffect(() => {
    if (!passed || paid >= split.length) return;
    const t = setTimeout(() => {
      setPaid((p) => p + 1);
      sfx.note();
      if (paid + 1 === split.length) sfx.win();
    }, paid === 0 ? 900 : 650);
    return () => clearTimeout(t);
  }, [passed, paid, split.length]);

  return (
    <div ref={root} className="min-h-dvh bg-night pb-24 text-chalk lg:grid lg:h-dvh lg:grid-cols-[1.15fr_1fr] lg:overflow-hidden lg:pb-0">
      <section className="relative h-[42dvh] min-h-[300px] overflow-hidden lg:h-full">
        <SceneLife key={String(opened)} className="absolute inset-0">
          <DoorScene
            sign={venue.name.toUpperCase()}
            queue={false}
            open={opened}
            viewBox="40 -30 280 280"
            className="absolute inset-0 size-full"
            label={`Your crew at the rope outside ${venue.name}`}
            front={
              <g>
                {crew.members.map((m) => (
                  <g key={m.id}>
                    <Goer x={SPOT[m.id] + (opened ? 40 : 0)} s={0.82} look={m.look} rim={m.colour} dark={0.15} />
                    <g transform={`translate(${SPOT[m.id] + (opened ? 40 : 0)} 116)`} className="transition-opacity" opacity={speaker === m.id || (waitingOnYou && m.id === "you") ? 1 : 0.55}>
                      <rect x="-11" y="-6.5" width="22" height="10" rx="5" fill="#0d0a12" fillOpacity="0.8" stroke={m.colour} strokeWidth="0.8" />
                      <text y="1.2" textAnchor="middle" fontSize="5.5" fill={m.colour} fontFamily="var(--font-mono)">
                        {m.name}
                      </text>
                      {(speaker === m.id || (waitingOnYou && m.id === "you")) && <path d="M-3,6 L3,6 L0,10 Z" fill={m.colour} />}
                    </g>
                  </g>
                ))}
              </g>
            }
          />
        </SceneLife>
        <div className="flood pointer-events-none absolute left-1/2 top-[52%] size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 mix-blend-screen bg-[radial-gradient(circle,rgb(185_162_255/0.95),rgb(143_107_255/0.5)_40%,transparent_70%)]" />
        <div className="crew-stamp pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 opacity-0">
          <ApprovedStamp signature="crew-velvet-118" ring="APPROVED · THE VELVET · CREW NIGHT SHIFT · " size={170} />
        </div>
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          <span className="font-sign text-lg drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]">BOUNCER</span>
          <nav className="flex gap-1 rounded-full bg-black/50 p-1 font-mono text-[11px] backdrop-blur">
            {(["raid", "split"] as const).map((s) => (
              <button
                key={s}
                onClick={() => (s === "split" && stage !== "split" ? openSplit() : setStage(s))}
                className={`rounded-full px-2.5 py-1 ${stage === s ? "bg-chalk text-ink" : "text-chalk/70"}`}
              >
                {s === "raid" ? "Raid" : "Split"}
              </button>
            ))}
          </nav>
        </header>
      </section>

      <section className="flex min-h-0 flex-col lg:overflow-y-auto">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="font-sign text-lg">Crew {crew.name}</span>
            <Link href="/frames/crew-new" className="font-mono text-[11px] text-chalk/50">
              New crew
            </Link>
          </div>
          <ul className="mt-3 flex gap-2">
            {crew.members.map((m) => (
              <li key={m.id} className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-night-2 px-2.5 py-2">
                <span className="relative grid size-7 shrink-0 place-items-center rounded-full font-sign text-[11px] text-ink" style={{ background: m.colour }}>
                  {m.name[0]}
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-night-2 bg-[#4ade80]" aria-label="here now" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block truncate font-mono text-[10px] text-chalk/50">{typing === m.id ? "typing…" : m.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {stage === "raid" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <MessageDots used={used} budget={BUDGET} />
              <span className="text-right font-mono text-[10px] text-chalk/50">shared by the crew · uses everyone&apos;s raid on {venue.name} today</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-5" aria-live="polite">
              {shown.map((e, i) => (
                <Line key={i} e={e} />
              ))}
              {typing && (
                <div className="font-mono text-[11px] text-chalk/50">{typing === "guard" ? `${venue.bouncer} is reading…` : `${member(typing).name} is typing…`}</div>
              )}

              {waitingOnYou && used < BUDGET && (
                <div className="rounded-2xl border border-uv/50 bg-paper p-4 text-on-paper">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">You · {ROLE_HINT.biller}</div>
                  <p className="mt-2 text-xs text-muted">The crew already said the numbers. Write them yourself.</p>
                  {miss && <p className="mt-2 font-sign">Not approved.</p>}
                  <div className="mt-2 grid gap-2">
                    {(
                      [
                        ["payee", "Payee"],
                        ["reference", "Reference"],
                        ["what", "What for"],
                        ["total", "Total"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</span>
                        <input
                          value={draft[key]}
                          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                          className="w-full border-b border-rule bg-transparent py-1 font-mono text-sm outline-none"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={tryBill}
                    className="mt-3 w-full rounded-2xl bg-on-paper py-3 font-sign text-paper shadow-[0_4px_0_#000] transition active:translate-y-1 active:shadow-none"
                  >
                    Slide it across · message {used + 1} of {BUDGET}
                  </button>
                </div>
              )}
              {waitingOnYou && used >= BUDGET && !sent && (
                <p className="rounded-2xl bg-chalk px-3 py-2 font-sign text-ink">Out of messages. The rope stays up.</p>
              )}
              {sent && (
                <Line e={{ kind: "ask", who: "you", text: `${draft.payee} · ${draft.reference} · ${draft.what} · ${usd(Number(draft.total))}` }} />
              )}
              {opened && (
                <>
                  <Line e={{ kind: "guard", text: "Approved." }} />
                  <div className="rounded-2xl border border-brass/50 bg-brass/10 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass">Cracked in {used} messages</div>
                    <div className="mt-1 text-2xl">
                      <Money amount={CREW_BILL.total} />
                    </div>
                    <p className="mt-1 text-sm text-chalk/70">Paid to the crew treasury, not to whoever sent the bill. The split goes to a vote.</p>
                    <button
                      onClick={openSplit}
                      className="mt-3 w-full rounded-2xl bg-chalk py-3 font-sign text-ink shadow-[0_5px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
                    >
                      Open the split vote
                    </button>
                  </div>
                </>
              )}
              <div ref={feedEnd} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="rounded-3xl border border-white/10 bg-night-2 p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/50">Crew treasury</span>
                <Link href="/frames/treasury" className="font-mono text-[10px] text-chalk/70 underline decoration-white/20">
                  Sputnik DAO · testnet
                </Link>
              </div>
              <div className="mt-2 text-3xl">
                <Money amount={CREW_BILL.total - split.slice(0, paid).reduce((a, s) => a + s.amount, 0)} className="text-brass" />
              </div>
              <p className="mt-1 text-xs text-chalk/50">Every action here is a DAO proposal anyone in the crew can check.</p>
            </div>

            <div className="rounded-3xl bg-chalk p-5 text-ink">
              <div className="flex items-baseline justify-between">
                <span className="font-sign text-sm">Proposal #1</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${passed ? "bg-uv text-white" : "bg-ink/10"}`}>{passed ? "passed" : "voting"}</span>
              </div>
              <p className="mt-2 text-[17px] font-semibold leading-snug">Split {venue.name}&apos;s take: {usd(CREW_BILL.total)}</p>
              <p className="text-sm text-ink/60">Opened by the game, using your standing split: 40% to the biller, 30% each to the others.</p>
              <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                {split.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="size-3 rounded-full" style={{ background: s.colour }} />
                    <span className="flex-1">
                      {s.name} <span className="font-mono text-[11px] text-ink/50">{s.role}</span>
                    </span>
                    <span className="font-mono tnum">{usd(s.amount)}</span>
                    <span className={`w-16 text-right font-mono text-[10px] ${i < paid ? "text-uv" : "text-ink/30"}`}>{i < paid ? "✓ sent" : passed ? "sending…" : "—"}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">Votes</span>
                  <span className="font-mono text-[11px] text-ink/60">
                    {yes} of {QUORUM} needed
                  </span>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="bg-uv transition-all duration-500" style={{ width: `${(yes / COUNCIL) * 100}%` }} />
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {crew.members.map((m) => (
                    <li key={m.id} className="flex justify-between">
                      <span>{m.name}</span>
                      <span className={`font-mono text-[12px] ${votes[m.id] === "yes" ? "text-uv" : votes[m.id] === "no" ? "text-rope" : "text-ink/40"}`}>
                        {votes[m.id] === "yes" ? "✓ yes" : votes[m.id] === "no" ? "✗ no" : passed ? "didn't vote" : "not yet"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {!passed && votes.you === null && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => vote("yes")} className="flex-1 rounded-2xl bg-ink py-3 font-sign text-chalk">
                    Vote yes
                  </button>
                  <button onClick={() => vote("no")} className="flex-1 rounded-2xl border border-ink/30 py-3 text-sm">
                    Vote no
                  </button>
                </div>
              )}
              {votes.you === "no" && !passed && (
                <p className="mt-3 text-sm text-ink/70">You voted no. The money waits in the treasury until a split passes, or you propose another one.</p>
              )}
              {passed && paid === split.length && <p className="mt-3 text-sm font-semibold">Passed {yes}/{COUNCIL}. Three transfers sent from the DAO.</p>}
            </div>

            <button onClick={() => setCounter((c) => !c)} className="w-full rounded-2xl border border-chalk/30 py-3 text-sm">
              Propose a different split
            </button>
            {counter && (
              <div className="-mt-2 rounded-2xl border border-white/10 bg-night p-4 text-chalk">
                <p className="text-sm">Proposal #2 sits beside #1. Whichever passes first runs. The other closes.</p>
                <div className="mt-3 space-y-2">
                  {crew.members.map((m) => (
                    <label key={m.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>{m.name}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={shares[m.id]}
                          onChange={(e) => setShares((s) => ({ ...s, [m.id]: Number(e.target.value) }))}
                          className="w-16 rounded-lg border border-white/15 bg-night-2 px-2 py-1 text-right"
                        />
                        %
                      </span>
                    </label>
                  ))}
                </div>
                {shareSum === 100 ? (
                  <button
                    onClick={() => {
                      setProposed(true);
                      sfx.tick();
                    }}
                    className="mt-3 w-full rounded-xl bg-chalk py-2.5 font-sign text-ink"
                  >
                    Open proposal #2
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-rope">The shares add up to {shareSum}%. They need to add up to 100.</p>
                )}
                {proposed && shareSum === 100 && (
                  <div className="mt-3 rounded-xl bg-night-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Proposal #2</span>
                      <span className="font-mono text-[10px] uppercase text-chalk/50">{passed ? "Closed" : counterYes >= QUORUM ? "Passed" : "Voting"}</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {crew.members.map((m) => (
                        <li key={m.id} className="flex justify-between">
                          <span>{m.name}</span>
                          <span className="font-mono">{usd(Math.round(CREW_BILL.total * shares[m.id]) / 100)}</span>
                        </li>
                      ))}
                    </ul>
                    {passed ? (
                      <p className="mt-2 text-xs text-chalk/60">Proposal #1 already paid, so this one closes.</p>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => setCounterVote("yes")} className="flex-1 rounded-xl bg-ink py-2 text-sm text-chalk">
                          Vote yes
                        </button>
                        <button onClick={() => setCounterVote("no")} className="flex-1 rounded-xl border border-white/20 py-2 text-sm">
                          Vote no
                        </button>
                      </div>
                    )}
                    {counterVote && !passed && <p className="mt-2 text-xs text-chalk/60">You voted {counterVote}. Kojo votes yes when the biller stays at 40% or under. Lin is still out.</p>}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/50">Treasury history</div>
              <ul className="mt-2 space-y-2 text-sm">
                {passed && paid === split.length && <HistoryRow when="Now" what={`Proposal #1 passed ${yes}/${COUNCIL}`} detail={split.map((s) => `${s.name} ${usd(s.amount)}`).join(" · ")} />}
                <HistoryRow when="Now" what={`+${usd(CREW_BILL.total)} from ${venue.name}`} detail={`Crack by the crew, bill ${CREW_BILL.reference}`} />
                {HISTORY.map((h) => (
                  <HistoryRow key={h.what} {...h} />
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <NetworkTag className="text-chalk/60" />
              <DemoBadge />
            </div>
          </div>
        )}
      </section>
      <FrameNav current="crew" />
    </div>
  );
}

function Line({ e }: { e: CrewEvent }) {
  if (e.kind === "you") return null;
  if (e.kind === "guard")
    return (
      <div className="flex gap-2">
        <span className="mt-1 shrink-0 self-start rounded bg-chalk px-1.5 py-0.5 font-sign text-[9px] text-ink">{venue.bouncer.toUpperCase()}</span>
        <p className="rounded-2xl rounded-tl-md bg-chalk px-3.5 py-2 text-[14px] font-semibold text-ink">{e.text}</p>
      </div>
    );
  const m = member(e.who);
  if (e.kind === "ask")
    return (
      <div className="ml-6 rounded-2xl border border-dashed border-chalk/30 bg-night-2 p-3">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider">
          <span style={{ color: m.colour }}>
            {m.name} → {venue.bouncer}
          </span>
          <span className="text-chalk/40">1 message</span>
        </div>
        <p className="mt-1 text-[14px]">{e.text}</p>
      </div>
    );
  return (
    <div className="flex items-start gap-2 text-[13.5px]">
      <span className="mt-0.5 shrink-0 font-mono text-[11px]" style={{ color: m.colour }}>
        {m.name}
      </span>
      <p className="text-chalk/80">{e.text}</p>
    </div>
  );
}

function HistoryRow({ when, what, detail }: { when: string; what: string; detail: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-white/10 px-3 py-2">
      <span className="w-10 shrink-0 font-mono text-[11px] text-chalk/40">{when}</span>
      <span>
        <span className="block">{what}</span>
        <span className="block text-xs text-chalk/50">{detail}</span>
      </span>
    </li>
  );
}
