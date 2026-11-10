"use client";

import gsap from "gsap";
import { useEffect, useRef, type ReactNode } from "react";
import { beatGlow, parallax, startIdle } from "@/lib/idle";

/** Idle life for a scene: the bouncer breathes and glances, the queue shuffles, the sign hums. */
export function SceneLife({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    let ctx: gsap.Context | null = null;
    let off = () => {};
    let offP = () => {};
    // The scene is already drawn and readable. The motion starts once the page has settled, off the first paint's critical path.
    const begin = () => {
      // A page may carry a phone and a desktop drawing and show one. Motion runs on the one that is drawn.
      const drawn = [...el.children].filter((child) => child.getClientRects().length > 0);
      ctx = gsap.context(() => (drawn.length > 0 ? drawn : [el]).forEach((part) => startIdle(part)), el);
      off = beatGlow(el);
      offP = parallax(el);
    };
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    let handle = 0;
    const timer = window.setTimeout(() => { handle = idle(begin, { timeout: 2500 }) as number; }, 1500);
    return () => {
      window.clearTimeout(timer);
      if (handle) cancelIdle(handle);
      off();
      offP();
      ctx?.revert();
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
