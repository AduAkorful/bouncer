"use client";

import { useEffect, useState } from "react";
import { demoNowMs } from "@/lib/demo/clock";

function remaining(endsAtMs: number) {
  const s = Math.max(0, Math.floor((endsAtMs - demoNowMs()) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function untilUtcMidnight() {
  const now = new Date(demoNowMs());
  return remaining(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** The close as a clock time in the viewer's own zone, e.g. "at 00:00 GMT". Rendered after mount, so the server and browser agree. */
export function CloseTime({ className = "", endsAtNs, prefix = "at" }: { className?: string; endsAtNs: string; prefix?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!/^[0-9]+$/.test(endsAtNs)) return;
    const ms = Number(BigInt(endsAtNs) / 1_000_000n);
    if (!Number.isSafeInteger(ms)) return;
    setText(`${prefix} ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(new Date(ms))}`);
  }, [endsAtNs, prefix]);
  return text ? <span className={className}>{text}</span> : null;
}

/** Counts down to `endsAtNs` when the vault supplied one. The demo clock does not move, so the reading stays put. */
export function Countdown({ className = "", endsAtNs }: { className?: string; endsAtNs?: string }) {
  let left = "--:--:--";
  if (endsAtNs && /^[0-9]+$/.test(endsAtNs)) {
    const ms = Number(BigInt(endsAtNs) / 1_000_000n);
    if (Number.isSafeInteger(ms)) left = remaining(ms);
  } else left = untilUtcMidnight();
  return <span className={`font-mono tnum ${className}`}>{left}</span>;
}

/** True once `endsAtNs` has passed, re-checked every second so a page can swap its label without a reload. */
export function useReached(endsAtNs?: string | null): boolean {
  const [reached, setReached] = useState(false);
  useEffect(() => {
    if (!endsAtNs || !/^[0-9]+$/.test(endsAtNs)) return;
    const ms = Number(BigInt(endsAtNs) / 1_000_000n);
    if (!Number.isSafeInteger(ms)) return;
    const check = () => setReached(Date.now() >= ms);
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [endsAtNs]);
  return reached;
}
