"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoBadge, FrameNav, NetworkTag } from "@/components/bits";

function Row({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button
      onClick={() => set(!on)}
      aria-pressed={on}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left"
    >
      <span>{label}</span>
      <span className={`font-mono text-[11px] uppercase tracking-wider ${on ? "text-chalk" : "text-chalk/40"}`}>{on ? "On" : "Off"}</span>
    </button>
  );
}

export default function SettingsFrame() {
  const [door, setDoor] = useState(true);
  const [crew, setCrew] = useState(true);
  const [sound, setSound] = useState(true);
  const [motion, setMotion] = useState(false);

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Settings</p>
        <h1 className="mt-1 font-sign text-3xl">Kwesi</h1>
        <p className="mt-2 text-sm text-chalk/65">Passkey on this device. Notifications are a demo toggle until the product ships.</p>

        <h2 className="mt-8 font-sign text-lg">Notifications</h2>
        <div className="mt-3 space-y-2">
          <Row label="Door reset" on={door} set={setDoor} />
          <Row label="Crew proposals" on={crew} set={setCrew} />
          <Row label="Sound" on={sound} set={setSound} />
          <Row label="Reduce motion" on={motion} set={setMotion} />
        </div>
        <p className="mt-3 text-xs text-chalk/45">Reduce motion here is a preference for the prototype. The pages also follow the system setting.</p>

        <h2 className="mt-8 font-sign text-lg">Account</h2>
        <div className="mt-3 space-y-2 text-sm">
          <Link href="/frames/profile" className="block rounded-2xl border border-white/10 px-4 py-3">
            Profile and wristband
          </Link>
          <Link href="/frames/passkey" className="block rounded-2xl border border-white/10 px-4 py-3">
            Passkey
          </Link>
          <Link href="/frames/home" className="block rounded-2xl border border-rope/40 px-4 py-3 text-rope">
            Sign out of the demo
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <NetworkTag className="text-chalk/55" />
          <DemoBadge />
        </div>
      </div>
      <FrameNav current="settings" />
    </main>
  );
}
