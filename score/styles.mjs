// The seven door styles. Each writes one bar at a time into eight stems.
//
// put(stem, beat, sound, gain, pan, verb, echo): beat is the position in the bar in beats; swing is applied for you.
// Stems: kick, perc, bass, chords, hook, arps, tick, pad. tick and pad are added by the renderer.

import * as d from "./dsp.mjs";

const { hz } = d;

/** Builds a chord bar entry. */
const C = (root, chord, arp = chord.map((m) => m + 12)) => ({ root, chord, arp });

// Shared drum sounds, made once.
const K = {
  house: d.kick(),
  techno: d.kick({ f0: 48, f1: 200, pitch: 0.02, decay: 0.22, drive: 3, len: 0.45 }),
  soft: d.kick({ f0: 58, f1: 100, pitch: 0.016, decay: 0.1, drive: 1.5 }),
  punch: d.kick({ f0: 54, f1: 140, pitch: 0.014, decay: 0.11, drive: 2 }),
};
const CLAP = d.clap();
const HAT = d.hat();
const OPEN = d.hat(0.22, 0.07);
const SHAKER = d.shaker();
const SNARE = d.snare();
const RIM = d.rim();
const RIDE = d.ride();
const BRUSH = d.brush();
const COWBELL = d.cowbell();
const WOOD = d.wood(1100);
const CONGA_LO = d.conga(200);
const CONGA_HI = d.conga(320, 0.09);

const shakerRow = (put, gain = 0.11, pan = -0.3) => {
  for (let k = 0; k < 16; k++) put("perc", k * 0.25, SHAKER, k % 4 === 2 ? gain * 2 : gain, pan);
};
const fourFloor = (put, k, gain) => { for (let x = 0; x < 4; x++) put("kick", x, k, gain); };
const melody = (put, line, inst, gain, pan = 0.1, verb = 0.12, echo = 1) => {
  for (const [x, m, len] of line) put("hook", x, inst(hz(m), len), gain, pan, verb, echo);
};

export const STYLES = [
  {
    // The film's own track.
    id: "pop",
    lift: { chords: 2.4, arps: 2.2 },
    posters: "comedy",
    bpm: 126,
    swing: null,
    minor: false,
    tonic: 60,
    prog: [C(36, [64, 67, 72, 76], [72, 76, 79, 84]), C(31, [62, 67, 71, 74], [71, 74, 79, 83]), C(33, [64, 69, 72, 76], [69, 72, 76, 81]), C(29, [65, 69, 72, 77], [69, 72, 77, 81])],
    duck: ["bass", "chords", "pad"],
    echo: { hook: 0.5, arps: 0.75 },
    lead: (f, dur) => d.chip(f, dur, 0.25),
    hit: (notes, dur) => d.stab(notes, dur),
    bar({ b, put, chord, BEAT }) {
      fourFloor(put, K.house, 0.62);
      for (const x of [1, 3]) put("perc", x, CLAP, 0.75, 0, 0.12);
      for (const x of [0.5, 1.5, 2.5, 3.5]) put("perc", x, OPEN, 0.4, 0.2);
      shakerRow(put);
      for (let k = 0; k < 8; k++) put("bass", k * 0.5, d.bass(hz(chord.root + (k % 2 ? 12 : 0)), 0.2 * BEAT), 0.5);
      for (const [x, v] of [[0.5, 1], [1.5, 0.8], [2.25, 0.6], [2.5, 0.9], [3.5, 0.8]]) put("chords", x, d.stab(chord.chord, 0.18 * BEAT), 0.2 * v, (x * 0.3) % 0.6 - 0.3, 0.1);
      const hook = [
        [[0, 76, 0.4], [0.5, 79, 0.2], [1, 81, 0.4], [1.75, 79, 0.2], [2, 76, 0.4], [3, 74, 0.2], [3.5, 72, 0.4]],
        [[0, 74, 0.4], [0.5, 76, 0.2], [1, 79, 0.4], [2, 76, 0.2], [2.5, 74, 0.2], [3, 72, 0.9]],
      ][b % 2];
      melody(put, hook.map(([x, m, l]) => [x, m, l * BEAT]), (f, l) => d.chip(f, l, 0.25), 0.12);
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let k = 0; k < 16; k++) put("arps", k * 0.25, d.chip(hz(chord.arp[order[k % 8]]), 0.12 * BEAT, 0.125), 0.055, k % 2 ? 0.4 : -0.4, 0, 0.3);
    },
  },
  {
    // Skyline Social: a warehouse all-nighter. A minor, rolling bass, dub stabs, an acid line.
    id: "techno",
    lift: { perc: 1.6, chords: 4, hook: 1.4, arps: 3.5 },
    posters: "techno",
    bpm: 130,
    swing: null,
    minor: true,
    tonic: 57,
    prog: [C(33, [57, 60, 64, 67]), C(33, [57, 60, 64, 67]), C(33, [57, 60, 64, 67]), C(33, [57, 60, 64, 67]), C(29, [57, 60, 64, 65]), C(29, [57, 60, 64, 65]), C(31, [59, 62, 65, 67]), C(31, [59, 62, 65, 67])],
    duck: ["bass", "chords", "pad"],
    echo: { chords: 0.75, hook: 0.75, arps: 0.75 },
    lead: (f, dur) => d.acid(f, dur, 1),
    hit: (notes, dur) => d.stab(notes, dur, 0.7),
    bar({ b, put, chord, BEAT }) {
      fourFloor(put, K.techno, 0.85);
      for (const x of [1, 3]) put("perc", x, CLAP, 0.45, 0, 0.25);
      for (let k = 0; k < 16; k++) {
        if (k % 4 === 2) put("perc", k * 0.25, OPEN, 0.32, 0.15);
        else if (k % 2 === 1) put("perc", k * 0.25, HAT, 0.14, k % 4 === 1 ? -0.3 : 0.3);
      }
      for (const x of b % 2 ? [1.75, 3.75] : [1.75, 3.25]) put("perc", x, RIM, 0.25, 0.4, 0.15);
      for (let k = 0; k < 16; k++) {
        if (k % 4 === 0) continue;
        const up = k % 8 === 7 ? 12 : 0;
        put("bass", k * 0.25, d.bass(hz(chord.root + up), 0.17 * BEAT, { sawAmt: 0.7, sub: 0.6, cut: 160, env: 900 }), 0.42);
      }
      for (const x of b % 2 ? [1.75] : [0.75, 2.5]) put("chords", x, d.stab(chord.chord, 0.14 * BEAT, 0.55), 0.17, -0.1, 0.35, 0.5);
      const acid = [
        [0, null, 12, 0, 3, null, 12, 10, 0, 0, null, 7, 12, null, 3, 5],
        [0, null, 12, null, 0, 15, 12, null, 7, null, 10, 0, null, 12, 10, 7],
      ][b % 2];
      acid.forEach((o, k) => { if (o != null) put("hook", k * 0.25, d.acid(hz(chord.root + 12 + o), 0.2 * BEAT, o >= 12 ? 1 : 0.2), 0.1, 0.1, 0.1, 0.25); });
      const tones = [chord.arp[0], chord.arp[2], chord.arp[1], chord.arp[3]];
      for (let k = 0; k < 8; k++) put("arps", k * 0.5, d.chip(hz(tones[k % 4] + 12), 0.1 * BEAT, 0.125), 0.045, k % 2 ? 0.5 : -0.5, 0.1, 0.4);
    },
  },
  {
    // The Ice House: amapiano. F minor, log drums, Rhodes, a breathy flute.
    id: "amapiano",
    posters: "amapiano",
    bpm: 112,
    swing: { grid: 16, amt: 0.1 },
    minor: true,
    tonic: 53,
    prog: [C(41, [56, 60, 63, 67]), C(41, [56, 60, 63, 67]), C(34, [61, 65, 68, 72]), C(34, [61, 65, 68, 72]), C(39, [55, 58, 60, 65]), C(39, [55, 58, 60, 65]), C(32, [56, 60, 63, 67]), C(32, [55, 60, 63, 67])],
    duck: [],
    echo: { hook: 0.75, arps: 0.5 },
    lead: (f, dur) => d.flute(f, dur),
    hit: (notes, dur) => mixNotes(notes, (m) => d.epiano(hz(m), dur)),
    bar({ b, put, chord, BEAT }) {
      fourFloor(put, K.soft, 0.5);
      shakerRow(put, 0.12, -0.25);
      for (const x of [1, 3]) put("perc", x, RIM, 0.32, 0.1, 0.1);
      for (const x of [0.75, 2.25, 3.5]) put("perc", x, WOOD, 0.16, 0.45);
      put("perc", 2.5, OPEN, 0.18, 0.2);
      if (b % 2) put("perc", 3.75, CONGA_HI, 0.2, -0.45);
      const r = chord.root;
      const log = b % 2 ? [[0.5, r + 12], [1.25, r], [2, r + 7], [2.75, r + 12], [3.5, r + 10]] : [[0, r], [0.75, r], [1.5, r + 12], [2.5, r + 7], [3, r], [3.5, r + 12]];
      for (const [x, m] of log) put("bass", x, d.logdrum(hz(m)), 0.5);
      for (const [x, len, v] of [[0, 1.2, 1], [1.75, 0.5, 0.7], [2.75, 1, 0.85]]) {
        chord.chord.forEach((m, n) => put("chords", x + n * 0.012, d.epiano(hz(m), len * BEAT, v), 0.075, (n - 1.5) * 0.15, 0.2));
      }
      const hook = [
        [[0, 77, 0.6], [1, 80, 0.4], [1.5, 82, 0.4], [2, 80, 0.9], [3.25, 77, 0.5]],
        [[0, 75, 0.4], [0.75, 77, 0.5], [1.5, 80, 1.2], [3, 72, 0.75]],
      ][b % 2];
      melody(put, hook.map(([x, m, l]) => [x, m, l * BEAT]), d.flute, 0.13, 0.15, 0.25);
      if (b % 2) chord.arp.concat(chord.arp.map((m) => m + 12)).forEach((m, k) => put("arps", 2 + k * 0.25, d.epiano(hz(m), 0.2 * BEAT, 0.6), 0.05, k % 2 ? 0.4 : -0.4, 0.2));
    },
  },
  {
    // Praia Verde: carnival soca. G major, cowbell, steel pans.
    id: "soca",
    posters: "carnival",
    bpm: 128,
    swing: null,
    minor: false,
    tonic: 55,
    prog: [C(43, [55, 59, 62, 67]), C(38, [54, 57, 62, 66]), C(40, [55, 59, 64, 67]), C(36, [55, 60, 64, 67])],
    duck: ["bass", "chords", "pad"],
    echo: { hook: 0.5, arps: 0.75 },
    lead: (f, dur) => d.pan(f, dur),
    hit: (notes, dur) => mixNotes(notes, (m) => d.pan(hz(m), dur)),
    bar({ b, put, chord, BEAT }) {
      fourFloor(put, K.house, 0.7);
      for (const x of [1, 3]) put("perc", x, CLAP, 0.45, 0, 0.12);
      for (const x of [0.75, 2.75]) put("perc", x, SNARE, 0.22, -0.1);
      for (const x of [0, 0.5, 1.5, 2, 2.5, 3.5]) put("perc", x, COWBELL, 0.12, 0.35);
      for (const x of [0.5, 1.5, 2.5, 3.5]) put("perc", x, OPEN, 0.16, -0.2);
      shakerRow(put, 0.09, -0.35);
      const r = chord.root;
      for (const [x, m] of [[0.5, r], [1, r + 7], [1.5, r + 12], [2.5, r], [3, r + 7], [3.5, r + 12]]) put("bass", x, d.bass(hz(m), 0.22 * BEAT), 0.48);
      for (const x of [0.5, 1.5, 2, 3.5]) chord.chord.forEach((m, n) => put("chords", x + n * 0.015, d.pan(hz(m + 12), 0.25 * BEAT, 0.7), 0.055, (n - 1.5) * 0.2, 0.15));
      const hook = [
        [[0, 79, 0.5], [0.5, 81, 0.5], [1, 83, 0.5], [1.5, 79, 0.25], [2, 86, 0.75], [3, 83, 0.5], [3.5, 81, 0.5]],
        [[0, 79, 0.5], [0.75, 76, 0.5], [1.5, 79, 0.5], [2, 74, 1], [3, 76, 0.5], [3.5, 79, 0.5]],
      ][b % 2];
      melody(put, hook.map(([x, m, l]) => [x, m, l * BEAT]), d.pan, 0.2, 0.15, 0.15);
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let k = 0; k < 16; k++) put("arps", k * 0.25, d.pan(hz(chord.arp[order[k % 8]] + 12), 0.1 * BEAT, 0.5), 0.04, k % 2 ? 0.45 : -0.45, 0.1, 0.3);
    },
  },
  {
    // Accra, and every door without a card: afrobeats. E minor, swung, congas, highlife guitar.
    id: "afrobeats",
    posters: "accra",
    bpm: 104,
    swing: { grid: 16, amt: 0.14 },
    minor: true,
    tonic: 52,
    prog: [C(40, [59, 62, 64, 67]), C(36, [60, 64, 67, 71]), C(43, [59, 62, 67, 71]), C(38, [57, 62, 66, 69])],
    duck: ["bass"],
    echo: { hook: 0.75, arps: 0.5 },
    lead: (f, dur) => d.chip(f, dur, 0.3, 0),
    hit: (notes, dur) => mixNotes(notes, (m) => d.pluck(hz(m), dur, 0.6)),
    bar({ b, put, chord, BEAT }) {
      for (const x of [0, 1.75, 2.5]) put("kick", x, K.punch, 0.7);
      for (const x of [1, 3]) put("perc", x, RIM, 0.34, 0, 0.12);
      put("perc", 2.75, RIM, 0.12, 0.2);
      shakerRow(put, 0.12, -0.3);
      for (const x of [0.5, 2]) put("perc", x, CONGA_LO, 0.3, -0.4);
      for (const x of [1.5, 1.75, 3.5, 3.75]) put("perc", x, CONGA_HI, 0.22, 0.4);
      const r = chord.root;
      for (const [x, m, l] of [[0, r, 0.6], [0.75, r, 0.3], [1.5, r + 7, 0.4], [2.5, r, 0.4], [3, r + 10, 0.3], [3.5, r + 12, 0.35]]) put("bass", x, d.bass(hz(m), l * BEAT, { sawAmt: 0.25, sub: 1, cut: 200, env: 700 }), 0.55);
      const g = [0.5, 0.75, 1.25, 2.5, 2.75, 3.25];
      g.forEach((x, k) => put("chords", x, d.pluck(hz(chord.chord[(k % 2) + 2]), 0.15 * BEAT, 0.5), 0.16, 0.3, 0.05));
      const hook = [
        [[0, 76, 0.5], [0.75, 79, 0.25], [1, 81, 0.5], [1.75, 79, 0.25], [2, 76, 0.75], [3, 74, 0.5]],
        [[0, 71, 0.5], [0.5, 74, 0.5], [1, 76, 0.75], [2.25, 74, 0.25], [2.5, 71, 0.5], [3.5, 69, 0.5]],
      ][b % 2];
      melody(put, hook.map(([x, m, l]) => [x, m, l * BEAT]), (f, l) => d.chip(f, l, 0.3), 0.09);
      for (let k = 0; k < 8; k++) put("arps", k * 0.5, d.mallet(hz(chord.arp[k % 4]), 0.25), 0.11, k % 2 ? 0.4 : -0.4, 0.1);
    },
  },
  {
    // London: UK garage. D minor, two-step kick, shuffled hats, organ stabs, vocal chops.
    id: "garage",
    posters: "london",
    bpm: 132,
    swing: { grid: 16, amt: 0.2 },
    minor: true,
    tonic: 50,
    prog: [C(38, [60, 64, 65, 69]), C(38, [60, 64, 65, 69]), C(43, [62, 65, 69, 70]), C(43, [62, 65, 69, 70]), C(34, [60, 62, 65, 69]), C(34, [60, 62, 65, 69]), C(33, [61, 64, 67, 70]), C(33, [61, 64, 67, 69])],
    duck: ["bass", "chords", "pad"],
    echo: { hook: 0.75, arps: 0.5 },
    lead: (f, dur) => d.vox(f, dur, "a"),
    hit: (notes, dur) => mixNotes(notes, (m) => d.organ(hz(m), dur)),
    bar({ b, put, chord, BEAT }) {
      for (const x of b % 2 ? [0, 1.75, 2.5] : [0, 2.5]) put("kick", x, K.punch, 0.75);
      for (const x of [1, 3]) { put("perc", x, SNARE, 0.35, 0, 0.12); put("perc", x, CLAP, 0.25, 0, 0.1); }
      for (let k = 0; k < 16; k++) put("perc", k * 0.25, HAT, k % 4 === 2 ? 0.2 : 0.09, k % 2 ? 0.3 : -0.2);
      put("perc", 3.75, RIM, 0.12, 0.4);
      const r = chord.root;
      for (const [x, m, l] of [[0, r, 0.6], [0.75, r, 0.25], [1.5, r + 12, 0.25], [2.5, r, 0.75], [3.5, r + 7, 0.25]]) put("bass", x, d.bass(hz(m), l * BEAT, { sawAmt: 0.3, sub: 1, cut: 150, env: 700 }), 0.55);
      for (const x of [0.75, 1.5, 3.25]) chord.chord.forEach((m) => put("chords", x, d.organ(hz(m), 0.2 * BEAT), 0.08, 0.1, 0.1));
      const hook = [
        [[0, 74, "a", 0.25], [0.5, 77, "o", 0.25], [1, 76, "e", 0.5], [2, 72, "a", 0.25], [2.75, 74, "o", 0.5]],
        [[0, 69, "e", 0.25], [0.5, 72, "a", 0.25], [1.25, 74, "o", 0.5], [2.5, 77, "a", 0.25], [3, 76, "e", 0.5]],
      ][b % 2];
      for (const [x, m, v, l] of hook) put("hook", x, d.vox(hz(m), l * BEAT, v), 0.2, 0.1, 0.2, 1);
      for (let k = 0; k < 8; k++) put("arps", k * 0.5, d.mallet(hz(chord.arp[(k * 3) % 4] + 12), 0.15), 0.06, k % 2 ? 0.5 : -0.5, 0.15);
    },
  },
  {
    // Jazz night: a lounge trio and a vibraphone. C major, swung, ii–V–I–VI.
    id: "jazz",
    lift: { perc: 1.8, chords: 1.6, hook: 1.4, arps: 2.5 },
    posters: "jazz",
    bpm: 92,
    swing: { grid: 8, amt: 0.33 },
    minor: false,
    tonic: 60,
    prog: [C(38, [53, 57, 60, 64]), C(43, [53, 57, 59, 64]), C(36, [52, 55, 59, 62]), C(45, [55, 58, 61, 64])],
    duck: [],
    echo: {},
    lead: (f, dur) => d.vibes(f, dur),
    hit: (notes, dur) => mixNotes(notes, (m) => d.piano(hz(m), dur)),
    bar({ b, put, chord, BEAT, next }) {
      fourFloor(put, K.soft, 0.22);
      for (const x of [0, 1, 1.5, 2, 3, 3.5]) put("perc", x, RIDE, x % 1 ? 0.07 : 0.11, 0.3);
      for (const x of [1, 3]) put("perc", x, HAT, 0.12, -0.15);
      for (let x = 0; x < 4; x++) put("perc", x, BRUSH, 0.07, -0.25);
      const r = chord.root;
      const third = chord.chord.some((m) => (m - r) % 12 === 4) ? 4 : 3;
      const walk = [r, r + third, r + 7, next.root + (b % 2 ? 1 : -1)];
      walk.forEach((m, x) => put("bass", x, d.bass(hz(m), 0.85 * BEAT, { sawAmt: 0.12, sub: 1, cut: 220, env: 500 }), 0.6));
      const comp = b % 2 ? [[0.5, 0.4], [2.5, 0.5]] : [[0, 0.6], [1.5, 0.4]];
      for (const [x, l] of comp) chord.chord.forEach((m, n) => put("chords", x + n * 0.008, d.piano(hz(m), l * BEAT, 0.7), 0.09, (n - 1.5) * 0.15, 0.2));
      const hook = [
        [[0, 72, 0.5], [0.5, 74, 0.5], [1, 77, 1], [2.5, 76, 0.5], [3, 74, 1]],
        [[0, 72, 1.5], [2, 71, 0.5], [2.5, 72, 0.5], [3, 76, 1]],
      ][b % 2];
      for (const [x, m, l] of hook) put("hook", x, d.vibes(hz(m), l * BEAT), 0.15, 0.15, 0.35);
      if (b % 2) for (const [x, k] of [[3, 2], [3.5, 3]]) put("arps", x, d.piano(hz(chord.arp[k] + 12), 0.3 * BEAT, 0.8), 0.07, 0.35, 0.3);
    },
  },
];

/** Plays several notes of one instrument at once. */
function mixNotes(notes, inst) {
  const parts = notes.map(inst);
  const len = Math.max(...parts.map((p) => p.length));
  const o = new Float32Array(len);
  for (const p of parts) for (let i = 0; i < p.length; i++) o[i] += p[i] / Math.sqrt(parts.length);
  return o;
}
