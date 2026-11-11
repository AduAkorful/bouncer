"use client";

import gsap from "gsap";

/** `?still=1` freezes motion. `?t=<ms>` parks the existing timelines at that moment. */
export function captureQuery(): { still: boolean; t: number | null } {
  if (typeof window === "undefined") return { still: false, t: null };
  const query = new URLSearchParams(window.location.search);
  const raw = query.get("t");
  const t = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  return { still: query.get("still") === "1", t };
}

export function holdCapture() {
  const flags = captureQuery();
  if (!flags.still && flags.t == null) {
    gsap.globalTimeline.play();
    return;
  }
  if (flags.t != null) gsap.globalTimeline.time(flags.t / 1000);
  gsap.globalTimeline.pause();
}
