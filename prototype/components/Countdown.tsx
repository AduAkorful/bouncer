"use client";

import { useEffect, useState } from "react";

function untilUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const s = Math.max(0, Math.floor((next - now.getTime()) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Time to the 00:00 UTC reset. Starts after mount so server and browser agree. */
export function Countdown({ className = "" }: { className?: string }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    setLeft(untilUtcMidnight());
    const t = setInterval(() => setLeft(untilUtcMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className={`font-mono tnum ${className}`}>{left ?? "--:--:--"}</span>;
}
