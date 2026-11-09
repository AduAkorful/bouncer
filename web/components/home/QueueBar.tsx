"use client";

import { useEffect, useState } from "react";

/**
 * The door card's Join button sits under the street, below the fold on many screens.
 * This bar carries the same link while that button is out of view, and steps aside when it shows.
 */
export function QueueBar({ href, targetId }: { href: string; targetId: string }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.6 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);
  if (hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-night via-night/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      <a
        href={href}
        className="chalk-focus mx-auto block max-w-lg rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
      >
        Join the queue
      </a>
    </div>
  );
}
