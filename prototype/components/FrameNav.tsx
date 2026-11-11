"use client";

import Link from "next/link";
import { useState } from "react";
import { LINKS } from "@/lib/demo/frames";

/** Prototype-only frame switcher. It opens upward and scrolls, and stays off the stamp. */
export function FrameNav({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const label = LINKS.find((link) => link.href.startsWith(`/frames/${current}`))?.group ?? "Frames";
  let group = "";
  return (
    <nav className="fixed bottom-3 left-3 z-50 flex flex-col items-start gap-2 font-mono text-[11px] text-chalk/80">
      {open && (
        <ul className="max-h-[70dvh] w-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/85 p-1 backdrop-blur">
          {LINKS.map((link) => {
            const head = link.group !== group;
            group = link.group;
            return (
              <li key={link.href}>
                {head ? <p className="px-3 pt-2 text-[10px] uppercase tracking-[0.16em] text-chalk/50">{link.group}</p> : null}
                <Link href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-1.5 hover:text-chalk">
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Frames: ${label}`}
        className="rounded-full border border-white/15 bg-black/75 px-3 py-1.5 backdrop-blur"
      >
        {open ? "✕" : "▤"} {label}
      </button>
    </nav>
  );
}
