"use client";

import gsap from "gsap";

declare global {
  interface Window {
    /** Set by `?film=1`: the film page moves this frame's clock to a moment, in ms since the frame loaded. */
    __filmSeek?: (ms: number) => void;
  }
}

/** `?still=1` freezes motion. `?t=<ms>` parks the existing timelines at that moment. `?film=1` hands the clock to the film page. */
export function captureQuery(): { still: boolean; t: number | null; film: boolean } {
  if (typeof window === "undefined") return { still: false, t: null, film: false };
  const query = new URLSearchParams(window.location.search);
  const raw = query.get("t");
  const film = query.get("film") === "1";
  const t = raw && /^\d+$/.test(raw) ? Number(raw) : film ? 0 : null;
  return { still: query.get("still") === "1", t, film };
}

// The film clock stops before any component makes a tween, so every tween on the page starts at 0 and the film page can place it exactly.
if (typeof window !== "undefined" && captureQuery().film) {
  gsap.globalTimeline.pause();
  gsap.globalTimeline.time(0);
  window.__filmSeek = (ms: number) => {
    gsap.globalTimeline.time(ms / 1000);
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = ms;
    }
  };
}

export function holdCapture() {
  const flags = captureQuery();
  if (flags.film) return;
  if (!flags.still && flags.t == null) {
    gsap.globalTimeline.play();
    return;
  }
  if (flags.t != null) gsap.globalTimeline.time(flags.t / 1000);
  gsap.globalTimeline.pause();
}
