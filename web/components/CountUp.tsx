"use client";

import { useEffect, useState } from "react";

/** A number that counts up once on mount. Server render and reduced motion show the final value. */
export function CountUp({ value, className = "", delay = 0.3, duration = 1.4 }: { value: number; className?: string; delay?: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setShown(value);
    };
  }, [value, delay, duration]);
  return <span className={`tnum ${className}`}>{shown.toLocaleString("en-US")}</span>;
}
