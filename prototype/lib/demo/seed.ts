/** A stable generator. `?seed=` changes it. Without one, every capture uses the same sequence. */
export function seedRandom(explicit?: string): () => number {
  const raw = explicit ?? (typeof window === "undefined" ? "1" : new URLSearchParams(window.location.search).get("seed") || "1");
  let h = 2166136261;
  for (const c of raw) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
