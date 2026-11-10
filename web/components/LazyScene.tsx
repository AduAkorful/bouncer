"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A listed door's thumbnail draws the whole street (hundreds of shapes) to show a 64px crop. The shapes are
 * drawn once the card is near the screen, so a page with many doors does not pay for the ones below the fold.
 */
export function LazyScene({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} aria-hidden="true" className={className}>{near ? children : null}</div>;
}
