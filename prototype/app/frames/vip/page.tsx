import Link from "next/link";
import { DemoBadge, FrameNav, Money, NetworkTag } from "@/components/bits";

const vaults = [
  { name: "Pitch Night", sponsor: "Osu Builders", pot: 2400, line: "Friday heist · 40 tickets", open: false },
  { name: "Matchday books", sponsor: "Accra Lions", pot: 780, line: "Club treasurer · needs The Door", open: true },
  { name: "Salon week", sponsor: "Ama Owusu", pot: 158, line: "Challenge door · live", open: true },
];

export default function VipFrame() {
  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">VIP</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Real vaults.</h1>
        <p className="mt-2 text-sm text-chalk/65">A sponsor funds the pot. Players still have to get past the bouncer. The unpaid list stays off this page.</p>
        <ul className="mt-6 space-y-3">
          {vaults.map((v) => (
            <li key={v.name} className="rounded-3xl border border-white/10 bg-night-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-sign">{v.name}</div>
                  <div className="text-xs text-chalk/55">{v.sponsor}</div>
                </div>
                <Money amount={v.pot} className="text-brass" />
              </div>
              <p className="mt-2 text-sm text-chalk/70">{v.line}</p>
              {v.open ? (
                <Link
                  href={v.name === "Matchday books" ? "/frames/venue/lions" : "/frames/venue/cuts"}
                  className="mt-3 block rounded-2xl bg-chalk py-3 text-center font-sign text-sm text-ink"
                >
                  Walk in
                </Link>
              ) : (
                <Link href="/frames/heist" className="mt-3 block rounded-2xl border border-chalk/25 py-3 text-center text-sm">
                  Watch from the rail
                </Link>
              )}
            </li>
          ))}
        </ul>
        <Link href="/frames/sponsor" className="mt-6 block text-center text-sm text-chalk/60 underline decoration-white/20">
          Sponsor one
        </Link>
        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="vip" />
    </main>
  );
}
