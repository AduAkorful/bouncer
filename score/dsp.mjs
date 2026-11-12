// Oscillators, filters and instruments for the game score. Everything is made from oscillators and noise.

export const SR = 44100;
export const TAU = Math.PI * 2;
export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

let seed = 0x5eed;
export const reseed = (s) => { seed = s | 0; };
export const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const noise = () => rand() * 2 - 1;

function blep(p, dt) {
  if (p < dt) { p /= dt; return p + p - p * p - 1; }
  if (p > 1 - dt) { p = (p - 1) / dt; return p * p + p + p + 1; }
  return 0;
}
export const saw = (p, dt) => 2 * p - 1 - blep(p, dt);
export const square = (p, dt, duty = 0.5) => (p < duty ? 1 : -1) + blep(p, dt) - blep((p + 1 - duty) % 1, dt);

function coeffs(type, f, q) {
  const w = (TAU * Math.min(Math.max(f, 20), SR * 0.45)) / SR;
  const c = Math.cos(w);
  const a = Math.sin(w) / (2 * q);
  const k = { lp: [(1 - c) / 2, 1 - c, (1 - c) / 2], hp: [(1 + c) / 2, -(1 + c), (1 + c) / 2], bp: [a, 0, -a] }[type];
  const a0 = 1 + a;
  return [k[0] / a0, k[1] / a0, k[2] / a0, (-2 * c) / a0, (1 - a) / a0];
}

/** Filters a buffer in place. `f` is a frequency, or a function of time for a sweep. */
export function filter(buf, type, f, q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let k = typeof f === "number" ? coeffs(type, f, q) : null;
  for (let i = 0; i < buf.length; i++) {
    if (typeof f === "function" && i % 32 === 0) k = coeffs(type, f(i / SR), q);
    const x = buf[i];
    const y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = y;
  }
  return buf;
}

const buf = (sec) => new Float32Array(Math.max(1, Math.floor(sec * SR)));
/** A note's gate: quick attack, held to `dur`, then a short release. */
const gate = (t, dur, a = 0.003, r = 0.012) => Math.min(1, t / a) * (t > dur ? Math.exp(-(t - dur) / r) : 1);

// ---------- Drums ----------

export function kick({ f0 = 52, f1 = 160, pitch = 0.018, decay = 0.13, drive = 2.2, len = 0.32 } = {}) {
  const o = buf(len);
  let ph = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    ph += (TAU * (f0 + f1 * Math.exp(-t / pitch))) / SR;
    let s = Math.sin(ph) * Math.exp(-t / decay);
    if (t < 0.002) s += noise() * 0.4 * (1 - t / 0.002);
    o[i] = Math.tanh(s * drive);
  }
  return o;
}

export function clap() {
  const o = buf(0.22);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let env = Math.exp(-t / 0.06) * 0.6;
    for (const d of [0, 0.009, 0.018]) if (t >= d) env += Math.exp(-(t - d) / 0.005);
    o[i] = noise() * env;
  }
  return filter(filter(o, "bp", 1700, 0.8), "hp", 900);
}

export function hat(len = 0.06, decay = 0.018, hp = 8000) {
  const o = buf(len);
  for (let i = 0; i < o.length; i++) o[i] = noise() * Math.exp(-(i / SR) / decay);
  return filter(o, "hp", hp);
}
export const shaker = () => filter(hat(0.07, 0.025), "bp", 6500, 1.2);

export function snare(tone = 210) {
  const o = buf(0.18);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = noise() * Math.exp(-t / 0.05) * 0.8 + Math.sin(TAU * tone * t) * Math.exp(-t / 0.03) * 0.6;
  }
  return filter(o, "hp", 400);
}

export function rim(f = 1800) {
  const o = buf(0.05);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = (Math.sin(TAU * f * t) * 0.7 + noise() * 0.5) * Math.exp(-t / 0.008);
  }
  return filter(o, "bp", f, 2);
}

/** A ride: metallic partials and noise, long and bright. */
export function ride(len = 0.9) {
  const o = buf(len);
  const fs = [3210, 4170, 5380, 6900, 8130];
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const f of fs) s += square((f * t) % 1, f / SR);
    o[i] = (s / fs.length * 0.5 + noise() * 0.5) * (Math.exp(-t / 0.35) * 0.6 + Math.exp(-t / 0.01) * 0.4);
  }
  return filter(o, "hp", 4500);
}

/** A brush swept across a snare. */
export function brush(len = 0.28) {
  const o = buf(len);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = noise() * Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5;
  }
  return filter(filter(o, "bp", 3500, 0.7), "lp", 7000);
}

export function cowbell() {
  const o = buf(0.3);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = (square((540 * t) % 1, 540 / SR) + square((800 * t) % 1, 800 / SR)) * 0.5 * (Math.exp(-t / 0.06) * 0.7 + Math.exp(-t / 0.002) * 0.3);
  }
  return filter(o, "bp", 900, 1.6);
}

export function conga(f = 220, decay = 0.12) {
  const o = buf(0.35);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const fr = f * (1 + 0.25 * Math.exp(-t / 0.01));
    o[i] = Math.sin(TAU * fr * t) * Math.exp(-t / decay) + noise() * Math.exp(-t / 0.004) * 0.3;
  }
  return o;
}

export function wood(f = 900) {
  const o = buf(0.08);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.7 * t)) * Math.exp(-t / 0.018);
  }
  return o;
}

export function thump() {
  const o = buf(0.8);
  let ph = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    ph += (TAU * (45 + 120 * Math.exp(-t / 0.04))) / SR;
    o[i] = Math.tanh(Math.sin(ph) * Math.exp(-t / 0.25) * 2) + noise() * Math.exp(-t / 0.03) * 0.5;
  }
  return o;
}

export function crash(len = 1.6) {
  const o = buf(len);
  for (let i = 0; i < o.length; i++) o[i] = noise() * Math.exp(-(i / SR) / 0.45);
  return filter(o, "hp", 5000);
}

export function whoosh(len) {
  const o = buf(len);
  for (let i = 0; i < o.length; i++) o[i] = noise() * (i / o.length) ** 2.2;
  return filter(o, "bp", (t) => 400 * (9000 / 400) ** (t / len), 1.4);
}

/** A clock tick: a short, dry wooden click. `tock` is the lower one. */
export function tick(tock = false) {
  const f = tock ? 1500 : 2300;
  const o = buf(0.04);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = (Math.sin(TAU * f * t) + noise() * 0.6) * Math.exp(-t / 0.004);
  }
  return filter(o, "bp", f, 3);
}

export function heartbeat() {
  const o = buf(0.25);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = Math.sin(TAU * (48 + 20 * Math.exp(-t / 0.03)) * t) * Math.exp(-t / 0.07) * Math.min(1, t / 0.004);
  }
  return o;
}

// ---------- Pitched ----------

export function stab(notes, dur, bright = 1) {
  const o = buf(dur + 0.08);
  const vs = notes.flatMap((m) => [hz(m) * 0.997, hz(m) * 1.003]).map((f) => ({ f, p: rand() }));
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of vs) { const dt = v.f / SR; v.p = (v.p + dt) % 1; s += saw(v.p, dt); }
    o[i] = (s / vs.length) * Math.min(1, t / 0.002) * Math.exp(-t / 0.16) * (t > dur ? Math.exp(-(t - dur) / 0.015) : 1);
  }
  return filter(o, "lp", (t) => 700 + 5200 * bright * Math.exp(-t / 0.07), 1.1);
}

export function bass(f, dur, { sub = 0.8, sawAmt = 0.55, cut = 250, env = 1600 } = {}) {
  const o = buf(dur + 0.03);
  let p = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const dt = f / SR;
    p = (p + dt) % 1;
    o[i] = (saw(p, dt) * sawAmt + Math.sin(TAU * p) * sub) * gate(t, dur, 0.003, 0.008);
  }
  return filter(o, "lp", (t) => cut + env * Math.exp(-t / 0.05), 1.2);
}

/** Amapiano's log drum: a sine that drops into pitch, long and saturated. */
export function logdrum(f, dur = 0.42) {
  const o = buf(dur + 0.05);
  let ph = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 + 0.5 * Math.exp(-t / 0.012))) / SR;
    const s = Math.sin(ph) + 0.35 * Math.sin(2 * ph) * Math.exp(-t / 0.08);
    o[i] = Math.tanh(s * 2.4) * Math.exp(-t / (dur * 0.55)) * Math.min(1, t / 0.002);
  }
  return filter(o, "lp", 1800);
}

/** A 303-style acid note: a saw through a resonant filter that snaps shut. */
export function acid(f, dur, accent = 0) {
  const o = buf(dur + 0.03);
  let p = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const dt = f / SR;
    p = (p + dt) % 1;
    o[i] = saw(p, dt) * gate(t, dur, 0.002, 0.01);
  }
  return filter(o, "lp", (t) => 280 + (1200 + 2400 * accent) * Math.exp(-t / (0.06 + 0.06 * accent)), 7 + 5 * accent);
}

export function chip(f, dur, duty = 0.25, slide = 0) {
  const o = buf(dur + 0.04);
  let p = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const vib = t > 0.12 ? 1 + 0.006 * Math.sin(TAU * 6 * t) : 1;
    const fr = f * vib * 2 ** ((slide * Math.min(t, dur)) / dur / 12);
    const dt = fr / SR;
    p = (p + dt) % 1;
    const env = Math.min(1, t / 0.002) * (0.75 + 0.25 * Math.exp(-t / 0.05)) * (t > dur ? Math.exp(-(t - dur) / 0.012) : 1);
    o[i] = square(p, dt, duty) * env;
  }
  return filter(o, "lp", 6000);
}

/** Electric piano: sine with a bell-like second partial and a slow tremolo. */
export function epiano(f, dur, vel = 1) {
  const o = buf(dur + 0.5);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const trem = 1 + 0.12 * Math.sin(TAU * 5 * t);
    const s = Math.sin(TAU * f * t) + 0.35 * vel * Math.sin(TAU * f * 2 * t) * Math.exp(-t / 0.25) + 0.15 * vel * Math.sin(TAU * f * 7 * t) * Math.exp(-t / 0.02);
    o[i] = s * trem * Math.exp(-t / 1.4) * Math.min(1, t / 0.003) * (t > dur ? Math.exp(-(t - dur) / 0.12) : 1);
  }
  return o;
}

/** Acoustic-ish piano: a few slightly stretched partials, each with its own decay. */
export function piano(f, dur, vel = 1) {
  const o = buf(dur + 0.6);
  const parts = [1, 2.003, 3.01, 4.02, 5.04].map((m, k) => ({ m, a: [1, 0.5, 0.28, 0.15, 0.08][k] * (k ? vel : 1), d: [1.8, 0.9, 0.5, 0.3, 0.2][k] }));
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const p of parts) s += p.a * Math.sin(TAU * f * p.m * t) * Math.exp(-t / p.d);
    if (t < 0.004) s += noise() * 0.2 * vel;
    o[i] = s * 0.6 * Math.min(1, t / 0.002) * (t > dur ? Math.exp(-(t - dur) / 0.15) : 1);
  }
  return o;
}

/** A plucked string, Karplus-Strong. */
export function pluck(f, dur, bright = 0.5) {
  const o = buf(dur + 0.2);
  const n = Math.max(2, Math.round(SR / f));
  const line = new Float32Array(n);
  // A brighter pluck starts from rawer noise; the string's own averaging darkens it as it rings.
  let lp = 0;
  for (let i = 0; i < n; i++) { lp += (1 - bright * 0.8) * (noise() - lp); line[i] = bright > 0.9 ? noise() : lp * 2; }
  let pos = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const a = line[pos];
    const b = line[(pos + 1) % n];
    line[pos] = (a + b) * 0.5 * 0.997;
    o[i] = a * (t > dur ? Math.exp(-(t - dur) / 0.05) : 1);
    pos = (pos + 1) % n;
  }
  return filter(o, "lp", 5000);
}

/** A steel pan: a few partials, a bright attack, a ringing tail. */
export function pan(f, dur, vel = 1) {
  const o = buf(dur + 0.6);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const s = Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2 * t) * Math.exp(-t / 0.3) + 0.25 * vel * Math.sin(TAU * f * 3.01 * t) * Math.exp(-t / 0.08) + 0.2 * vel * Math.sin(TAU * f * 4.2 * t) * Math.exp(-t / 0.03);
    o[i] = s * Math.exp(-t / 0.7) * Math.min(1, t / 0.004) * (t > dur ? Math.exp(-(t - dur) / 0.2) : 1) * 0.6;
  }
  return o;
}

/** Marimba or kalimba: a sine with a hollow fourth-partial knock. */
export function mallet(f, dur = 0.3) {
  const o = buf(dur + 0.3);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t / 0.02)) * Math.exp(-t / 0.22) * Math.min(1, t / 0.002);
  }
  return o;
}

/** Vibraphone: a pure tone with a motor tremolo. */
export function vibes(f, dur) {
  const o = buf(dur + 1);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const trem = 1 - 0.35 * (0.5 + 0.5 * Math.sin(TAU * 5.5 * t));
    const s = Math.sin(TAU * f * t) + 0.12 * Math.sin(TAU * f * 4 * t) * Math.exp(-t / 0.1);
    o[i] = s * trem * Math.exp(-t / 1.6) * Math.min(1, t / 0.003) * (t > dur ? Math.exp(-(t - dur) / 0.4) : 1) * 0.7;
  }
  return o;
}

/** A soft breathy flute. */
export function flute(f, dur) {
  const o = buf(dur + 0.08);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const vib = 1 + 0.008 * Math.sin(TAU * 5 * t) * Math.min(1, t / 0.3);
    const s = Math.sin(TAU * f * vib * t) + 0.12 * Math.sin(TAU * f * 2 * vib * t) + noise() * 0.06;
    o[i] = s * Math.min(1, t / 0.04) * (t > dur ? Math.exp(-(t - dur) / 0.05) : 1) * 0.7;
  }
  return filter(o, "lp", 4500);
}

/** An organ: drawbars at the first four harmonics. */
export function organ(f, dur) {
  const o = buf(dur + 0.04);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const s = Math.sin(TAU * f * t) + 0.6 * Math.sin(TAU * f * 2 * t) + 0.4 * Math.sin(TAU * f * 3 * t) + 0.25 * Math.sin(TAU * f * 4 * t);
    o[i] = s * 0.35 * gate(t, dur, 0.004, 0.02);
  }
  return o;
}

/** A muted horn: a saw through a mouth-shaped band. */
export function horn(f, dur) {
  const o = buf(dur + 0.08);
  let p = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const vib = 1 + 0.01 * Math.sin(TAU * 5.5 * t) * Math.min(1, t / 0.25);
    const dt = (f * vib) / SR;
    p = (p + dt) % 1;
    o[i] = saw(p, dt) * gate(t, dur, 0.03, 0.05);
  }
  return filter(filter(o, "bp", (t) => 900 + 600 * Math.min(1, t / 0.08), 1.4), "lp", 3000);
}

const VOWELS = { a: [730, 1090], e: [530, 1840], i: [300, 2200], o: [570, 840], u: [320, 900] };
/** A chopped vocal: a buzz shaped by two vowel formants. */
export function vox(f, dur, vowel = "a") {
  const o = buf(dur + 0.05);
  const n = buf(dur + 0.05);
  let p = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const dt = f / SR;
    p = (p + dt) % 1;
    o[i] = saw(p, dt) * gate(t, dur, 0.01, 0.03);
  }
  const [f1, f2] = VOWELS[vowel];
  const a = filter(Float32Array.from(o), "bp", f1, 6);
  const b = filter(Float32Array.from(o), "bp", f2, 8);
  for (let i = 0; i < n.length; i++) n[i] = a[i] * 1.6 + b[i] * 0.9;
  return n;
}

/** A sustained pad: detuned saws behind a low filter, slow in and out. */
export function pad(notes, dur, cut = 1100) {
  const o = buf(dur + 0.6);
  const vs = notes.flatMap((m) => [-7, 0, 7].map((c) => ({ f: hz(m) * 2 ** (c / 1200), p: rand() })));
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of vs) { const dt = v.f / SR; v.p = (v.p + dt) % 1; s += saw(v.p, dt); }
    o[i] = (s / vs.length) * Math.min(1, t / 0.35) * (t > dur ? Math.exp(-(t - dur) / 0.25) : 1);
  }
  return filter(o, "lp", cut, 0.8);
}
