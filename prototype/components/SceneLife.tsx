"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { captureQuery, holdCapture } from "@/lib/capture";
import { beatGlow, parallax, startIdle } from "@/lib/idle";

/** Idle life for a scene: the bouncer breathes and glances, the queue shuffles, the sign hums. */
export function SceneLife({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const flags = captureQuery();
    if (flags.t == null || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stop = begin(ref.current);
    holdCapture();
    return stop;
  }, []);
  useEffect(() => {
    const flags = captureQuery();
    if (flags.still || flags.t != null || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    let stop = () => {};
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    let handle = 0;
    const timer = window.setTimeout(() => { handle = idle(() => { stop = begin(el); }, { timeout: 2500 }) as number; }, 1500);
    return () => {
      window.clearTimeout(timer);
      if (handle) cancelIdle(handle);
      stop();
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function begin(el: HTMLElement) {
  let ctx: gsap.Context | null = null;
  let off = () => {};
  let offP = () => {};
  const drawn = [...el.children].filter((child) => child.getClientRects().length > 0);
  ctx = gsap.context(() => (drawn.length > 0 ? drawn : [el]).forEach((part) => startIdle(part)), el);
  off = beatGlow(el);
  offP = parallax(el);
  return () => {
    off();
    offP();
    ctx?.revert();
  };
}
