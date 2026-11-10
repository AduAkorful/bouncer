"use client";

import { useEffect, useState } from "react";

/**
 * The door card's Join button sits under the street, below the fold on many screens.
 * This bar carries the same link whenever that button is out of view, above or below, and steps aside when it shows.
 */
export function QueueBar({ href, targetId }: { href: string; targetId: string }) {
  const [below, setBelow] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    // Shown while the card's own button is out of view, whether the page is above it or past it.
    const observer = new IntersectionObserver(([entry]) => setBelow(!entry.isIntersecting), { threshold: 0.6 });
    observer.observe(target);
    // The first screen is left as drawn: the bar covered the pitch and the pot before anyone moved (QA R21 N-01).
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [targetId]);
  if (!below || !scrolled) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-night/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_16px_rgb(0_0_0/0.4)]">
      <a
        href={href}
        className="chalk-focus mx-auto block max-w-lg rounded-2xl bg-chalk py-2.5 text-center font-sign text-lg text-ink transition hover:bg-white active:translate-y-0.5"
      >
        Join the queue
      </a>
    </div>
  );
}
