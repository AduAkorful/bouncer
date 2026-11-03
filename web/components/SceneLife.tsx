"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { beatGlow, parallax, startIdle } from "@/lib/idle";

/** Idle life for a scene: the bouncer breathes and glances, the queue shuffles, the sign hums. */
export function SceneLife({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    const ctx = gsap.context(() => startIdle(el), el);
    const off = beatGlow(el);
    const offP = parallax(el);
    return () => {
      off();
      offP();
      ctx.revert();
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
