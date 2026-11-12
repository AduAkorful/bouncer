// A listening preview: one raid played out with each style's stems, using the same mix table as the browser.
//
//   node score/preview.mjs            writes score/out/<style>/preview.wav for every style
//
// The arc: the street outside, the raid opening, messages running down, a refusal, the last-message lull,
// approval, the door opening into the full mix, and the payout.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as d from "./dsp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "out");
const { SR } = d;
const src = readFileSync(join(here, "..", "web", "lib", "score-mix.ts"), "utf8");
// The browser's mix table is the single source: parsed from the TypeScript module.
const MIX = Function(`return ${src.split("export const SCORE_MIX = ")[1].split(" satisfies")[0]}`)();
const STYLES = Function(`return ${readFileSync(join(here, "..", "web", "lib", "score-styles.ts"), "utf8").split("export const SCORE_STYLES = ")[1].split(" as const")[0]}`)();

function read(path) {
  const b = readFileSync(path);
  const ch = b.readUInt16LE(22);
  const n = (b.length - 44) / (2 * ch);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = b.readInt16LE(44 + i * 2 * ch) / 32767;
    R[i] = ch === 2 ? b.readInt16LE(46 + i * 4) / 32767 : L[i];
  }
  return { L, R };
}

function write(path, L, R) {
  const n = L.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path, b);
}

// [state, bars, stinger at the start of the section]
const ARC = [["street", 2], ["left6", 2], ["left4", 2], ["left3", 1, "refuse"], ["left3", 1], ["left2", 2], ["left1", 2], ["left1", 1, "approve"], ["inside", 4, "gotin"], ["inside", 2, "paid"]];

for (const [id, st] of Object.entries(STYLES)) {
  const BAR = st.loop / st.bars;
  const bars = ARC.reduce((n, a) => n + a[1], 0);
  const N = Math.ceil((bars * BAR + 3) * SR);
  const stems = Object.fromEntries(Object.keys(MIX.street.gains).map((s) => [s, read(join(OUT, id, `${s}.wav`))]));
  const L = new Float32Array(N), R = new Float32Array(N);
  const cut = new Float32Array(N).fill(20000);
  const gains = Object.fromEntries(Object.keys(stems).map((s) => [s, new Float32Array(N)]));
  let bar = 0;
  for (const [state, n, sting] of ARC) {
    const mix = MIX[state];
    const a = Math.round(bar * BAR * SR), z = Math.round((bar + n) * BAR * SR);
    for (const s of Object.keys(stems)) gains[s].fill(mix.gains[s] ?? 0, a, z);
    cut.fill(mix.wall, a, z);
    if (sting) {
      const sg = read(join(OUT, id, `${sting}.wav`));
      for (let i = 0; i < sg.L.length && a + i < N; i++) { L[a + i] += sg.L[i] * MIX.stingerGain; R[a + i] += sg.R[i] * MIX.stingerGain; }
      if (sting === "refuse") for (const s of Object.keys(stems)) for (let i = a; i < Math.min(z, a + Math.round(BAR * SR)); i++) gains[s][i] *= MIX.refuseDuck;
    }
    bar += n;
  }
  // Glide gains and the wall like the browser's setTargetAtTime (time constant 0.12 s).
  const k = 1 - Math.exp(-1 / (0.12 * SR));
  const pad = Math.round(0.25 * SR), loop = Math.round(st.loop * SR);
  const music = { L: new Float32Array(N), R: new Float32Array(N) };
  for (const s of Object.keys(stems)) {
    let g = gains[s][0];
    for (let i = 0; i < N; i++) {
      g += (gains[s][i] - g) * k;
      const j = pad + (i % loop);
      music.L[i] += stems[s].L[j] * g;
      music.R[i] += stems[s].R[j] * g;
    }
  }
  let c = cut[0];
  const smooth = cut.map((v) => (c += (v - c) * k));
  d.filter(music.L, "lp", (t) => smooth[Math.min(N - 1, Math.round(t * SR))]);
  d.filter(music.R, "lp", (t) => smooth[Math.min(N - 1, Math.round(t * SR))]);
  for (let i = 0; i < N; i++) { L[i] += music.L[i] * MIX.musicGain; R[i] += music.R[i] * MIX.musicGain; }
  write(join(OUT, id, "preview.wav"), L, R);
  console.log(`${id}: preview ${(N / SR).toFixed(1)} s`);
}
