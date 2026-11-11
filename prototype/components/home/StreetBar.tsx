"use client";

import { useEffect, useState, type RefObject } from "react";

/** A track for a street that is wider than the phone. The mark shows the part on screen. */
export function StreetBar({ scroller }: { scroller: RefObject<HTMLElement | null> }) {
  const [mark, setMark] = useState<{ width: number; left: number } | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const span = el.scrollWidth - el.clientWidth;
      if (span <= 1 || el.clientWidth <= 0) {
        setMark(null);
        return;
      }
      const width = (el.clientWidth / el.scrollWidth) * 100;
      const left = (el.scrollLeft / span) * (100 - width);
      setMark({ width, left });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const watched = new ResizeObserver(measure);
    watched.observe(el);
    if (el.firstElementChild) watched.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", measure);
      watched.disconnect();
    };
  }, [scroller]);

  if (!mark) return null;
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20 h-1.5 rounded-full bg-black/50" aria-hidden>
      <div className="h-full rounded-full bg-chalk shadow-[0_0_8px_rgb(239_232_218/0.45)]" style={{ width: `${mark.width}%`, marginLeft: `${mark.left}%` }} />
    </div>
  );
}
