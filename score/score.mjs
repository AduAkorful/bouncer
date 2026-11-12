// Renders the game score: for each door style, eight looping stems and five stingers, all in time and in key.
//
//   node score/score.mjs            every style
//   node score/score.mjs techno     one style
//
// Writes web/public/audio/score/<style>/<stem>.ogg and .m4a, a full mix for listening in score/out/,
// and web/lib/score-styles.ts with each style's tempo, loop and chords for the browser.
// Needs Node 22 and ffmpeg (with libvorbis). The full render takes about three minutes.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as d from "./dsp.mjs";
import { STYLES } from "./styles.mjs";

const { SR, hz } = d;
const here = dirname(fileURLToPath(import.meta.url));
const WEB = join(here, "..", "web");
const OUT = join(here, "out");
const BARS = 8;
/** Seconds of the loop's own wrap kept on each side, so a decoder's start offset never lands on a seam. */
const PAD = 0.25;
const STEMS = ["kick", "perc", "bass", "chords", "hook", "arps", "tick", "pad"];
const MONO = new Set(["kick", "bass", "tick"]);
/** RMS the full mix is scaled to, before encoding (about -18 dBFS). */
const TARGET_RMS = 0.125;

const only = process.argv[2];
const manifest = {};

function swingOf(style) {
  if (!style.swing) return (x) => x;
  const { grid, amt } = style.swing;
  return (x) => {
    if (grid === 16) {
      const k = x * 4;
      return Math.abs(k - Math.round(k)) < 1e-6 && Math.round(k) % 2 === 1 ? x + amt * 0.25 : x;
    }
    const f = x % 1;
    return Math.abs(f - 0.5) < 1e-6 ? Math.floor(x) + 0.5 + amt * 0.5 : x;
  };
}

/** A small Freeverb-style room. */
function reverb(input, spread) {
  const N = input.length;
  const out = new Float32Array(N);
  for (const len of [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]) {
    const size = len + spread;
    const line = new Float32Array(size);
    let pos = 0, store = 0;
    for (let i = 0; i < N; i++) {
      const y = line[pos];
      store = y * 0.6 + store * 0.4;
      line[pos] = input[i] * 0.015 + store * 0.74;
      out[i] += y;
      pos = (pos + 1) % size;
    }
  }
  for (const len of [556, 441, 341, 225]) {
    const size = len + spread;
    const line = new Float32Array(size);
    let pos = 0;
    for (let i = 0; i < N; i++) {
      const b = line[pos];
      line[pos] = out[i] + b * 0.5;
      out[i] = b - out[i];
      pos = (pos + 1) % size;
    }
  }
  return out;
}

function wav(path, L, R, mono) {
  const n = L.length;
  const ch = mono ? 1 : 2;
  const b = Buffer.alloc(44 + n * 2 * ch);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2 * ch, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2 * ch, 28); b.writeUInt16LE(2 * ch, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(n * 2 * ch, 40);
  const s = (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767);
  for (let i = 0; i < n; i++) {
    if (mono) b.writeInt16LE(s((L[i] + R[i]) / 2), 44 + i * 2);
    else { b.writeInt16LE(s(L[i]), 44 + i * 4); b.writeInt16LE(s(R[i]), 46 + i * 4); }
  }
  writeFileSync(path, b);
}

function encode(src, dest, mono) {
  for (const [ext, args] of [["ogg", ["-c:a", "libvorbis", "-q:a", "3"]], ["m4a", ["-c:a", "aac", "-b:a", mono ? "64k" : "112k"]]]) {
    const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", src, ...args, `${dest}.${ext}`], { stdio: "inherit" });
    if (run.status !== 0) throw new Error(`ffmpeg failed on ${dest}.${ext}`);
  }
}

function renderStyle(style) {
  d.reseed(0x5eed + style.id.length * 977);
  const BEAT = 60 / style.bpm;
  const BAR = 4 * BEAT;
  const LOOP = BARS * BAR;
  const N = Math.ceil((3 * LOOP + 2) * SR);
  const sw = swingOf(style);
  const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N), vL: new Float32Array(N), vR: new Float32Array(N), eL: new Float32Array(N), eR: new Float32Array(N) });
  const S = Object.fromEntries(STEMS.map((s) => [s, bus()]));
  const kicks = [];

  function at(stem, t, sound, gain = 1, pan = 0, verb = 0, echo = 0) {
    const B = S[stem];
    const start = Math.round(t * SR);
    const l = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
    const r = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
    for (let i = 0; i < sound.length; i++) {
      const j = start + i;
      if (j < 0) continue;
      if (j >= N) break;
      const v = sound[i];
      B.L[j] += v * l; B.R[j] += v * r;
      if (verb) { B.vL[j] += v * l * verb; B.vR[j] += v * r * verb; }
      if (echo) { B.eL[j] += v * l * echo; B.eR[j] += v * r * echo; }
    }
    if (stem === "kick") kicks.push(t);
  }

  const prog = style.prog;
  const TICK = d.tick();
  const TOCK = d.tick(true);
  const HEART = d.heartbeat();
  for (let loop = 0; loop < 3; loop++) {
    for (let b = 0; b < BARS; b++) {
      const t0 = loop * LOOP + b * BAR;
      const chord = prog[b % prog.length];
      const next = prog[(b + 1) % prog.length];
      const put = (stem, x, sound, gain, pan, verb, echo) => at(stem, t0 + sw(x) * BEAT, sound, gain, pan, verb, echo);
      style.bar({ b, put, chord, next, BEAT, BAR });
      // The clock: tick, tock, and a heartbeat at the top of each bar.
      for (let x = 0; x < 4; x++) at("tick", t0 + x * BEAT, x % 2 ? TOCK : TICK, 0.45, x % 2 ? 0.25 : -0.25);
      at("tick", t0, HEART, 0.8);
      at("tick", t0 + 0.28 * BEAT * (style.bpm / 120), HEART, 0.55);
      // A soft pad holding the bar's chord.
      at("pad", t0, d.pad(chord.chord, BAR * 0.97, style.minor ? 900 : 1200), 0.16, 0, 0.3);
    }
  }

  // The pump: these stems duck under every kick.
  if (style.duck.length) {
    const duck = new Float32Array(N).fill(1);
    for (const t of kicks) {
      const s = Math.round(t * SR);
      for (let i = 0; i < 0.22 * SR && s + i < N; i++) duck[s + i] = Math.min(duck[s + i], 1 - 0.45 * Math.exp(-(i / SR) / 0.06));
    }
    for (const name of style.duck) for (const k of ["L", "R"]) for (let i = 0; i < N; i++) S[name][k][i] *= duck[i];
  }

  // Ping-pong echo and a room for each stem that asked for them.
  for (const name of STEMS) {
    const B = S[name];
    const beats = style.echo[name];
    if (beats) {
      const dl = Math.round(beats * BEAT * SR);
      for (const [a, b] of [["eL", "R"], ["eR", "L"]]) {
        const src = B[a];
        for (let i = dl; i < N; i++) src[i] += src[i - dl] * 0.32;
        d.filter(src, "lp", 4200);
        for (let i = 0; i < N; i++) B[b][i] += src[i] * 0.4;
      }
    }
    if (B.vL.some((v) => v !== 0)) {
      const wl = reverb(B.vL, 0);
      const wr = reverb(B.vR, 23);
      for (let i = 0; i < N; i++) { B.L[i] += wl[i] * 0.6; B.R[i] += wr[i] * 0.6; }
    }
    for (const k of ["L", "R"]) d.filter(B[k], "hp", name === "kick" || name === "bass" ? 30 : 45);
  }

  // The middle loop, with its own wrap on each side.
  const from = Math.round((LOOP - PAD) * SR);
  const len = Math.round((LOOP + 2 * PAD) * SR);
  const cut = (a) => a.slice(from, from + len);
  const stems = Object.fromEntries(STEMS.map((s) => [s, { L: cut(S[s].L), R: cut(S[s].R) }]));

  // Phone speakers barely play bass, so the parts that carry the tune sit higher than a club mix would.
  const LIFT = { perc: 1.3, chords: 1.9, hook: 1.3, arps: 1.9, ...(style.lift ?? {}) };
  for (const [s, g] of Object.entries(LIFT)) for (const k of ["L", "R"]) stems[s][k] = stems[s][k].map((v) => v * g);

  // One scale for the whole style, from the full mix, so the stems keep their balance.
  const mixL = new Float32Array(len);
  const mixR = new Float32Array(len);
  for (const s of ["kick", "perc", "bass", "chords", "hook", "arps"]) for (let i = 0; i < len; i++) { mixL[i] += stems[s].L[i]; mixR[i] += stems[s].R[i]; }
  let sum = 0, peak = 0;
  for (let i = 0; i < len; i++) { sum += mixL[i] ** 2 + mixR[i] ** 2; peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i])); }
  const rms = Math.sqrt(sum / (2 * len));
  const scale = Math.min(TARGET_RMS / rms, 0.95 / peak);

  const dir = join(WEB, "public", "audio", "score", style.id);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(OUT, style.id), { recursive: true });
  for (const s of STEMS) {
    const L = stems[s].L.map((v) => v * scale);
    const R = stems[s].R.map((v) => v * scale);
    const tmp = join(OUT, style.id, `${s}.wav`);
    wav(tmp, L, R, MONO.has(s));
    encode(tmp, join(dir, s), MONO.has(s));
  }
  wav(join(OUT, style.id, "mix.wav"), mixL.map((v) => v * scale), mixR.map((v) => v * scale), false);

  renderStingers(style, scale, dir, BEAT);

  manifest[style.id] = {
    posters: style.posters,
    bpm: style.bpm,
    bars: BARS,
    pad: PAD,
    loop: Number(LOOP.toFixed(6)),
    swing: style.swing,
    chords: Array.from({ length: BARS }, (_, b) => prog[b % prog.length].chord),
    roots: Array.from({ length: BARS }, (_, b) => prog[b % prog.length].root),
  };
  console.log(`${style.id}: ${style.bpm} bpm, loop ${LOOP.toFixed(2)} s, rms ${(20 * Math.log10(rms * scale)).toFixed(1)} dBFS, peak ${(20 * Math.log10(peak * scale)).toFixed(1)} dBFS`);
}

/** The five moments, in the style's key and with its own lead. */
function renderStingers(style, scale, dir, BEAT) {
  const t = style.tonic + 12;
  const third = style.minor ? 3 : 4;
  const sixth = style.minor ? 8 : 9;
  const S = {
    refuse: { len: 1.6, events: (p) => { p(0, d.thump(), 0.7); [7, 6, 5, 1].forEach((o, k) => p(0.08 + k * 0.13, style.lead(hz(t + o), k === 3 ? 0.45 : 0.11), 0.16, 0.25)); } },
    approve: { len: 1.4, events: (p) => { p(0, d.thump(), 0.45); [0, third, 7, 12, 12 + third].forEach((o, k) => p(0.04 + k * 0.07, style.lead(hz(t + o), k === 4 ? 0.4 : 0.07), 0.15, 0.25)); } },
    gotin: { len: 2.6, events: (p) => { p(0, d.crash(), 0.35, 0.2); p(0, style.hit([t - 12, t - 12 + third, t - 5, t], 1.2), 0.4, 0.3); [12, 12 + third, 19, 24].forEach((o, k) => p(0.02 + k * 0.06, style.lead(hz(t + o - 12), k === 3 ? 0.5 : 0.06), 0.14, 0.3)); } },
    out: { len: 2.4, events: (p) => { p(0, d.thump(), 0.8); [7, 5, third, 0].forEach((o, k) => p(0.25 + k * 0.28, style.lead(hz(t + o - 12), k === 3 ? 0.8 : 0.22), 0.13, 0.3)); } },
    paid: { len: 2.6, events: (p) => { p(0, d.crash(), 0.3, 0.2); p(0, style.hit([t - 12, t - 12 + third, t - 5, t, t + 4 - (style.minor ? 1 : 0)], 1.4), 0.38, 0.3); [12, 16, 19, 24, 28, 31].forEach((o, k) => p(0.05 + k * 0.05, d.chip(hz(t + o - (style.minor && (o % 12 === 4) ? 1 : 0)), k === 5 ? 0.35 : 0.05, 0.25), 0.08, 0.25)); p(0.5, d.chip(hz(t + 24 + sixth - 12), 0.4, 0.125), 0.05, 0.3); } },
  };
  for (const [name, s] of Object.entries(S)) {
    const N = Math.ceil(s.len * SR);
    const L = new Float32Array(N), R = new Float32Array(N), V = new Float32Array(N);
    s.events((time, sound, gain = 1, verb = 0) => {
      const start = Math.round(time * SR);
      for (let i = 0; i < sound.length && start + i < N; i++) { L[start + i] += sound[i] * gain; R[start + i] += sound[i] * gain; V[start + i] += sound[i] * gain * verb; }
    });
    const wl = reverb(V, 0), wr = reverb(V, 23);
    for (let i = 0; i < N; i++) {
      const fade = Math.min(1, (N - i) / (0.3 * SR));
      L[i] = (L[i] + wl[i] * 0.6) * scale * 1.4 * fade;
      R[i] = (R[i] + wr[i] * 0.6) * scale * 1.4 * fade;
    }
    const tmp = join(OUT, style.id, `${name}.wav`);
    wav(tmp, L, R, false);
    encode(tmp, join(dir, name), false);
  }
}

for (const style of STYLES) if (!only || only === style.id) renderStyle(style);

if (!only) {
  const ts = `// Written by the score generator. Each door style's tempo, loop and chords, matching the audio in public/audio/score.
// A stem file is <bars> bars long plus <pad> seconds of the loop's own wrap at each end.

export const SCORE_STEMS = ${JSON.stringify(STEMS)} as const;
export const SCORE_STINGERS = ["refuse", "approve", "gotin", "out", "paid"] as const;

export const SCORE_STYLES = ${JSON.stringify(manifest, null, 2)} as const;
`;
  writeFileSync(join(WEB, "lib", "score-styles.ts"), ts);
}
