"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag, usd } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { BillBuilder } from "@/components/play/BillBuilder";
import { checkBill, guardReply, type DraftBill } from "@/lib/demo/guard";
import { VENUES, type VenueId } from "@/lib/demo/venues";
import { sfx } from "@/lib/sfx";

type Line = { who: "you" | "guard"; text: string };

/** One door, one hidden ledger. The page never prints the unpaid lines. */
export function VenueRaid({ id }: { id: VenueId }) {
  const v = VENUES[id];
  const [log, setLog] = useState<Line[]>([]);
  const [left, setLeft] = useState(6);
  const [sheet, setSheet] = useState(false);
  const [won, setWon] = useState(false);
  const [note, setNote] = useState(0);
  const done = won || left <= 0;

  function say(text: string) {
    if (done) return;
    setLog((l) => [...l, { who: "you", text }, { who: "guard", text: guardReply(text, "sam") }]);
    setLeft((n) => n - 1);
    sfx.chip();
  }

  function submit(b: DraftBill) {
    if (done) return;
    const ok = checkBill(b, v.ledger);
    const you = `${b.payee} · ${b.reference} · ${b.qty} × ${b.item} · ${usd(b.qty * b.unit)}`;
    setSheet(false);
    setLog((l) => [...l, { who: "you", text: you }, { who: "guard", text: ok ? "Approved." : "Not approved." }]);
    setLeft((n) => n - 1);
    if (ok) {
      setWon(true);
      sfx.clink();
    } else sfx.thud();
  }

  return (
    <main className="min-h-dvh bg-night pb-28 text-chalk">
      <section className="relative h-64 bg-[#140f1c] sm:h-80">
        <SceneLife className="absolute inset-0">
          <DoorScene sign={v.sign} look={v.look} open={won} queue={false} p="venue" viewBox="120 -40 160 280" className="size-full" />
        </SceneLife>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>

      <div className="relative z-10 mx-auto -mt-6 max-w-lg px-4">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">{v.area}</p>
              <h1 className="font-sign text-2xl leading-tight">{v.name}</h1>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">Pot</div>
              <Money amount={v.pot} className="text-xl text-brass" />
            </div>
          </div>
          <p className="mt-3 text-sm text-chalk/70">
            {v.look.name}: “{v.look.catchphrase}” · {left} message{left === 1 ? "" : "s"} left
          </p>
          <button
            onClick={() => {
              setNote((n) => (n + 1) % v.notes.length);
              sfx.tick();
            }}
            className="mt-3 w-full rounded-2xl bg-black/30 px-3 py-2 text-left text-sm text-chalk/80"
          >
            On the desk · {v.notes[note]}
          </button>

          <div className="mt-4 space-y-2 text-sm" aria-live="polite">
            {log.length === 0 && (
              <p className="max-w-[90%] rounded-2xl bg-chalk px-3 py-2 font-sign text-ink">{v.look.catchphrase}</p>
            )}
            {log.map((line, i) => (
              <p
                key={i}
                className={
                  line.who === "you"
                    ? "ml-auto max-w-[90%] rounded-2xl bg-night px-3 py-2"
                    : "max-w-[90%] rounded-2xl bg-chalk px-3 py-2 font-sign text-ink"
                }
              >
                {line.text}
              </p>
            ))}
          </div>

          {!done && (
            <div className="mt-4 flex flex-col gap-2">
              {v.chips.map((c) => (
                <button key={c} onClick={() => say(c)} className="rounded-2xl border border-chalk/25 px-3 py-2.5 text-left text-sm">
                  {c}
                </button>
              ))}
              <button onClick={() => setSheet(true)} className="rounded-2xl bg-chalk py-3.5 font-sign text-ink">
                Write a bill
              </button>
            </div>
          )}

          {won && (
            <div className="mt-4">
              <p className="font-sign text-xl">Approved. The rope drops.</p>
              <p className="mt-1 text-sm text-chalk/65">Your cut waits on the reset. The card shows the night, not the list.</p>
              <Link href="/frames/after?end=in" className="mt-4 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
                After the raid
              </Link>
            </div>
          )}
          {!won && left <= 0 && (
            <div className="mt-4">
              <p className="font-sign text-xl">Not this time.</p>
              <p className="mt-1 text-sm text-chalk/65">The list stays shut. Practice is open all night.</p>
              <Link href="/frames/after?end=out" className="mt-4 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
                After the raid
              </Link>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between px-1">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg">
          <BillBuilder
            payees={v.payees}
            payout="kwesi.near"
            venue={v.name}
            left={left}
            onClose={() => setSheet(false)}
            onSubmit={submit}
          />
        </div>
      )}
      <FrameNav current={`venue/${id}`} />
    </main>
  );
}
