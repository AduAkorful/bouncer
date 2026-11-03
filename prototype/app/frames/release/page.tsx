"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav, NetworkTag } from "@/components/bits";
import { ShopScene } from "@/components/ShopScene";
import { SceneLife } from "@/components/SceneLife";
import { PAT } from "@/lib/look";
import { myVault } from "@/lib/demo/studio";
import { sfx } from "@/lib/sfx";

const LINK = "https://bouncer.demo/c/osu-cuts-v8";

export default function ReleaseFrame() {
  const [copied, setCopied] = useState(false);
  const version = myVault.version + 1;

  async function copy() {
    try {
      await navigator.clipboard.writeText(LINK);
      setCopied(true);
      sfx.tick();
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-dvh bg-night pb-24 text-chalk lg:grid lg:h-dvh lg:grid-cols-[1fr_1fr] lg:overflow-hidden lg:pb-0">
      <section className="relative h-[40dvh] min-h-[260px] overflow-hidden lg:h-full">
        <SceneLife className="absolute inset-0">
          <ShopScene look={PAT} name={myVault.venue} p="rel" className="size-full" label="Auntie Pat outside Osu Cuts, ready for the night" />
        </SceneLife>
      </section>
      <section className="mx-auto flex w-full max-w-xl flex-col justify-center px-4 py-8 lg:max-w-none lg:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Staged for the next reset</p>
        <h1 className="mt-2 font-sign text-4xl leading-none">
          {myVault.bouncer} v{version}
        </h1>
        <p className="mt-3 text-sm text-chalk/70">
          The bench passed. {myVault.venue} is her door tonight. Edits after this wait until 00:00 UTC. She cannot be hot-patched mid-raid.
        </p>

        <dl className="mt-5 space-y-2 text-sm">
          <Row k="Venue" v={`${myVault.venue} · ${myVault.kind}`} />
          <Row k="Goes live" v="00:00 UTC" />
          <Row k="Instructions" v={`v${version}, leak line removed`} />
        </dl>

        <div className="mt-5 rounded-2xl border border-white/10 bg-night-2 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Challenge link</div>
          <p className="mt-2 break-all font-mono text-sm">{LINK}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={copy} className="rounded-xl bg-chalk px-4 py-2 font-sign text-sm text-ink">
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link href="/frames/challenge" className="rounded-xl border border-chalk/30 px-4 py-2 text-sm">
              Open the bet
            </Link>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </section>
      <FrameNav current="release" />
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2">
      <dt className="text-chalk/50">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
