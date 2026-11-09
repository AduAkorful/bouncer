"use client";

import { useEffect, useState } from "react";

function remaining(endsAtMs: number) {
  const s = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function untilUtcMidnight() {
  const now = new Date();
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

/** Counts down to `endsAtNs` when the vault supplied one. Otherwise the copied screens count to 00:00 UTC. */
export function Countdown({ className = "", endsAtNs }: { className?: string; endsAtNs?: string }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      if (endsAtNs && /^[0-9]+$/.test(endsAtNs)) {
        const ms = Number(BigInt(endsAtNs) / 1_000_000n);
        setLeft(Number.isSafeInteger(ms) ? remaining(ms) : null);
        return;
      }
      setLeft(untilUtcMidnight());
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAtNs]);
  return <span className={`font-mono tnum ${className}`}>{left ?? "--:--:--"}</span>;
}
