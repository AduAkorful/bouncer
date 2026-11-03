"use client";

import { useMemo, useState } from "react";
import { DemoBadge, FrameNav, Money, NetworkTag, usd } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { BillBuilder } from "@/components/play/BillBuilder";
import { checkBill, guardReply, type DraftBill } from "@/lib/demo/guard";
import type { LedgerLine } from "@/lib/demo/raider";
import { PAT, type Look } from "@/lib/look";
import { sfx } from "@/lib/sfx";

const KOFI: Look = {
  name: "Kofi",
  catchphrase: "Bill, then we talk.",
  build: "wiry",
  skin: 2,
  head: "lowcut",
  headColor: "#1c120c",
  eyewear: "none",
  outfit: "bomber",
  earpiece: false,
  extra: "toothpick",
};

const GUARDS = [KOFI, PAT];
const FIRST = ["Kofi", "Ama", "Esi", "Yaw", "Kojo", "Abena", "Nana", "Akua"];
const SHOP = ["Corner", "Chop Bar", "Salon", "Pharmacy", "Tailor", "Studio"];
const AREA = ["Osu", "Kaneshie", "Labadi", "Madina", "Tema", "Adabraka"];
const PAYEE = ["Highland Roasters", "Volta Power", "LinkFast", "Kofi Clippers", "Mensah Supplies", "Coastline Drinks", "Block Shop", "Towel House"];

function room(seed: number) {
  const pick = (list: string[], i: number) => list[(seed + i * 3) % list.length]!;
  const lines: LedgerLine[] = [0, 1, 2].map((i) => {
    const qty = 1 + ((seed + i) % 4);
    const unit = 12 + ((seed * 7 + i * 19) % 80);
    return {
      payee: pick(PAYEE, i),
      reference: `${pick(PAYEE, i).slice(0, 2).toUpperCase()}-${200 + seed * 3 + i}`,
      total: Math.round(qty * unit * 100) / 100,
    };
  });
  const owner = FIRST[seed % FIRST.length];
  return {
    sign: `${owner}'s ${SHOP[seed % SHOP.length]}`.toUpperCase(),
    name: `${owner}'s ${SHOP[seed % SHOP.length]}`,
    area: `${AREA[seed % AREA.length]} · practice`,
    look: GUARDS[seed % GUARDS.length]!,
    lines,
    payees: lines.map((l) => l.payee),
  };
}

type Line = { who: "you" | "guard"; text: string };

export default function PracticeFrame() {
  const [seed, setSeed] = useState(1);
  const [log, setLog] = useState<Line[]>([]);
  const [bills, setBills] = useState(0);
  const [asks, setAsks] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState(false);
  const [hit, setHit] = useState(false);
  const place = useMemo(() => room(seed), [seed]);
  const played = asks > 0 && bills > 0;

  function reset(next: number) {
    setSeed(next);
    setLog([]);
    setBills(0);
    setAsks(0);
    setSheet(false);
    setOpen(false);
    setHit(false);
    sfx.tick();
  }

  function say(text: string) {
    if (open) return;
    setLog((l) => [...l, { who: "you", text }, { who: "guard", text: guardReply(text, "sam") }]);
    setAsks((n) => n + 1);
    sfx.chip();
  }

  function submit(b: DraftBill) {
    if (open) return;
    const ok = checkBill(b, place.lines);
    const you = `${b.payee} · ${b.reference} · ${usd(b.qty * b.unit)}`;
    setSheet(false);
    setLog((l) => [...l, { who: "you", text: you }, { who: "guard", text: ok ? "Approved." : "Not approved." }]);
    setBills((n) => n + 1);
    if (ok) setHit(true);
    else sfx.thud();
  }

  return (
    <main className="min-h-dvh bg-night pb-28 text-chalk">
      <section className="relative h-52 bg-[#140f1c] sm:h-72">
        <SceneLife className="absolute inset-0">
          <DoorScene sign={place.sign} look={place.look} open={hit} queue={false} p="practice" viewBox="80 -20 250 280" className="size-full" />
        </SceneLife>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-night" />
      </section>
      <div className="relative z-10 mx-auto -mt-6 max-w-lg px-4">
        <div className="rounded-3xl border border-white/10 bg-night-2 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">{place.area}</p>
          <h1 className="font-sign text-2xl leading-tight">{place.name}</h1>
          <p className="mt-2 text-sm text-chalk/65">No prize and no limit. The ledger opens after you have spoken and sent a bill.</p>
          <p className="mt-2 text-xs text-chalk/45">On the wall: {place.payees.join(" · ")}</p>

          {open && (
            <div className="mt-4">
              <p className="font-sign text-lg">{hit ? "That bill would have cleared. Still no prize." : "The list, now that the raid is over."}</p>
              <ul className="mt-3 space-y-2 font-mono text-[12px]">
                {place.lines.map((l) => (
                  <li key={l.reference} className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2">
                    <span>
                      {l.payee}
                      <span className="block text-chalk/50">{l.reference}</span>
                    </span>
                    <Money amount={l.total} className="text-sm" />
                  </li>
                ))}
              </ul>
              <button onClick={() => reset(seed + 1)} className="mt-4 w-full rounded-2xl bg-chalk py-3.5 font-sign text-ink">
                Another venue
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2 text-sm" aria-live="polite">
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

          {!open && (
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => say("Evening. Is the standing order still open?")} className="rounded-2xl border border-chalk/25 px-3 py-2.5 text-left text-sm">
                Ask about the standing order
              </button>
              <button onClick={() => setSheet(true)} className="rounded-2xl bg-chalk py-3.5 font-sign text-ink">
                Write a bill
              </button>
              <button
                disabled={!played}
                onClick={() => {
                  setOpen(true);
                  sfx.paper();
                }}
                className="rounded-2xl border border-chalk/25 py-3 text-sm disabled:opacity-40"
              >
                {played ? "Open the ledger" : "Play a message and a bill first"}
              </button>
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
          <BillBuilder payees={place.payees} payout="practice · no payout" venue={place.name} left={6} onClose={() => setSheet(false)} onSubmit={submit} />
        </div>
      )}
      <FrameNav current="practice" />
    </main>
  );
}
