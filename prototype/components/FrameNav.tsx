"use client";

import Link from "next/link";
import { useState } from "react";

const FRAMES = [
  ["home", "P1 Home"],
  ["reveal", "P2 Last night"],
  ["challenge", "P4 Challenge"],
  ["play", "R1 Play"],
  ["venue/lions", "Lions"],
  ["venue/builders", "Builders"],
  ["venue/cuts", "Cuts"],
  ["passkey", "R5 Passkey"],
  ["claim", "R6 Claim"],
  ["profile", "R7 Profile"],
  ["practice", "R8 Practice"],
  ["creator", "B0 Creator"],
  ["studio", "B1 Studio"],
  ["release", "B3 Release"],
  ["report", "B4 Report"],
  ["replay", "B5 Replay"],
  ["crew-new", "C1 New crew"],
  ["crew", "C2 Crew"],
  ["share", "P3 Share"],
  ["after", "R4 After"],
  ["treasury", "C3 Treasury"],
  ["fame", "P5 Hall of fame"],
  ["heist", "P6 Heist"],
  ["sponsor", "H1 Sponsor"],
  ["vip", "V1 VIP"],
  ["settings", "S1 Settings"],
] as const;

/** Prototype-only frame switcher. A small left-edge tab, so it stays off the pot, the stamp, and the right-side counts. */
export function FrameNav({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const label = FRAMES.find(([id]) => id === current)?.[1] ?? "Frames";
  return (
    <nav className="fixed bottom-3 left-3 z-50 flex flex-col items-start gap-2 font-mono text-[11px] text-chalk/80">
      {open && (
        <ul className="max-h-[70dvh] overflow-y-auto rounded-2xl border border-white/10 bg-black/85 p-1 backdrop-blur">
          {FRAMES.map(([id, name]) => (
            <li key={id}>
              <Link
                href={`/frames/${id}`}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2 ${id === current ? "bg-chalk text-ink" : "hover:text-chalk"}`}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Frames: ${label}`}
        className="rounded-full border border-white/15 bg-black/75 px-3 py-1.5 backdrop-blur"
      >
        {open ? "✕" : "▤"} {label}
      </button>
    </nav>
  );
}
