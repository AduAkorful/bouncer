// Turns a verdict signature into stamp geometry, so every real approval has its own pattern
// and anyone holding the signature can redraw it.

function rng(hex: string) {
  let seed = parseInt(hex.slice(0, 8), 16) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StampPattern {
  rose: string;
  spiro: string;
  ticks: number;
  rotation: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function stampPattern(signature: string, radius = 62): StampPattern {
  const next = rng(signature);

  // Rose curve r = R(a + b cos kθ): petal count and depth come from the signature.
  const k = 5 + Math.floor(next() * 8);
  const a = 0.55 + next() * 0.15;
  const b = 1 - a;
  const rose: string[] = [];
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 2;
    const r = radius * (a + b * Math.cos(k * t));
    rose.push(`${i ? "L" : "M"}${r1(r * Math.cos(t))},${r1(r * Math.sin(t))}`);
  }

  // Hypotrochoid inner weave.
  const R = 40;
  const rr = 7 + Math.floor(next() * 9);
  const d = 10 + next() * 14;
  const turns = rr / gcd(R, rr);
  const spiro: string[] = [];
  const steps = 900;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = (R - rr) * Math.cos(t) + d * Math.cos(((R - rr) / rr) * t);
    const y = (R - rr) * Math.sin(t) - d * Math.sin(((R - rr) / rr) * t);
    spiro.push(`${i ? "L" : "M"}${r1(x * 0.62)},${r1(y * 0.62)}`);
  }

  return {
    rose: rose.join(""),
    spiro: spiro.join(""),
    ticks: 36 + Math.floor(next() * 4) * 12,
    rotation: Math.floor(next() * 360),
  };
}

function gcd(x: number, y: number): number {
  return y === 0 ? x : gcd(y, x % y);
}

export const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
