"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav, NetworkTag } from "@/components/bits";
import { Goer } from "@/components/Goer";
import { crew, ROLE_HINT } from "@/lib/demo/crew";
import { sfx } from "@/lib/sfx";

export default function CreateCrewFrame() {
  const [name, setName] = useState(crew.name);
  const [invited, setInvited] = useState<string[]>([]);
  const [made, setMade] = useState(false);

  function invite(id: string) {
    setInvited((list) => (list.includes(id) ? list : [...list, id]));
    sfx.pop();
  }

  function create() {
    setMade(true);
    sfx.clink();
  }

  const friends = crew.members.filter((m) => m.id !== "you");
  const ready = invited.length >= 2 && name.trim().length > 0;

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Sputnik DAO · testnet</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">Start a crew</h1>
        <p className="mt-2 text-sm text-chalk/65">Two friends and a name. The DAO is the council: every split after a crack is a proposal they can check.</p>

        <label className="mt-5 block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-chalk/50">Crew name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/15 bg-night-2 px-4 py-3 font-sign text-lg outline-none"
          />
        </label>

        <div className="mt-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/50">Invite</div>
          <div className="mt-2 flex gap-2">
            {friends.map((m) => {
              const on = invited.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => invite(m.id)}
                  disabled={on}
                  className={`rounded-full border px-4 py-2 text-sm ${on ? "border-chalk bg-chalk text-ink" : "border-white/20"}`}
                >
                  {on ? `✓ ${m.name}` : `Invite ${m.name}`}
                </button>
              );
            })}
          </div>
        </div>

        {!made ? (
          <button onClick={create} disabled={!ready} className="mt-6 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
            Create the DAO
          </button>
        ) : (
          <section className="mt-6 rounded-3xl border border-white/10 bg-night-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-uv-glow">Council live</div>
            <h2 className="mt-1 font-sign text-2xl">{name.trim()}</h2>
            <ul className="mt-4 flex justify-between gap-2">
              {crew.members.map((m) => (
                <li key={m.id} className="flex flex-1 flex-col items-center">
                  <div className="h-28 w-full overflow-hidden rounded-2xl bg-[#140f1c]">
                    <svg viewBox="-36 -150 72 160" className="h-full w-full" role="img" aria-label={m.name}>
                      <Goer x={0} y={4} s={0.92} look={m.look} rim={m.colour} dark={0.1} />
                    </svg>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{m.name}</div>
                  <div className="text-center text-[11px] capitalize leading-tight text-chalk/50">{m.role}</div>
                  <div className="text-center text-[10px] leading-tight text-chalk/40">{ROLE_HINT[m.role]}</div>
                </li>
              ))}
            </ul>
            <Link href="/frames/crew" className="mt-5 block rounded-2xl bg-chalk py-3.5 text-center font-sign text-ink">
              Open the crew raid
            </Link>
          </section>
        )}

        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="crew-new" />
    </main>
  );
}
