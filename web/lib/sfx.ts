// The game's moments (stamps, paper, coins, the door, the stings) are recorded CC0 files in `public/audio`,
// listed in `public/audio/AUDIO_CREDITS.md`. The street, the club loop and the voices are still synthesized here.
// Nothing plays until the player has tapped (browsers require a gesture) and sound is on.
//
// Graph: every voice → master → compressor → speakers, with a send into a generated-impulse reverb.
// The club's music runs through a low-pass "wall" whose cutoff says where you're standing.

let ctx: AudioContext | null = null;
let enabled = false;
let master: GainNode | null = null;
let verbIn: GainNode | null = null;
let white: AudioBuffer | null = null;
let brown: AudioBuffer | null = null;
type StreetSound = "accra" | "london" | "harbour" | "drums" | "quiet";
let city: StreetSound = "accra";

/** Which street's ambience plays: tro-tros in Accra, sirens in London, a foghorn, drums, or nothing. */
export function setCity(c: StreetSound) {
  city = c;
}

function impulse(c: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      // One-pole low-pass on the noise darkens the tail, like a room with soft walls.
      lp += 0.35 * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp).connect(ctx.destination);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 2.2, 3);
    verbIn = ctx.createGain();
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.4;
    verbIn.connect(verb).connect(verbOut).connect(master);
    white = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    brown = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const w = white.getChannelData(0);
    const b = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < w.length; i++) {
      w[i] = Math.random() * 2 - 1;
      last = (last + 0.02 * w[i]!) / 1.02;
      b[i] = last * 3.5;
    }
    void loadSamples(ctx);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ——— Recorded moments ———

export const SAMPLE_NAMES = [
  "stamp-refused", "stamp-approved", "door-open", "coins", "paid-chips", "pen", "paper", "key", "chip",
  "hand-over", "win", "paid", "turned-away", "tap", "error",
] as const;
export type SampleName = (typeof SAMPLE_NAMES)[number];

const samples = new Map<SampleName, AudioBuffer>();
const missing = new Set<SampleName>();
let loading: Promise<void> | null = null;

/** Decodes every recorded moment once, after the first tap. A file that fails is marked missing, and that moment uses the synth. */
function loadSamples(c: AudioContext): Promise<void> {
  if (loading) return loading;
  const ext = typeof Audio !== "undefined" && new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "m4a";
  loading = Promise.all(
    SAMPLE_NAMES.map(async (name) => {
      try {
        const res = await fetch(`/audio/${name}.${ext}`);
        if (!res.ok) throw new Error(String(res.status));
        samples.set(name, await c.decodeAudioData(await res.arrayBuffer()));
      } catch {
        // A sound that will not load is not worth stopping the game for: the synth stands in.
        missing.add(name);
      }
    }),
  ).then(() => undefined);
  return loading;
}

/**
 * Plays a recorded moment. True when it played, or when it is still loading (then nothing plays, rather than the
 * synth version for one tap). False only when the file is missing, so the caller falls back to the synth.
 */
function sample(name: SampleName, o: Out & { gain?: number; rate?: number } = {}): boolean {
  if (!enabled || !ensure() || !ctx) return true;
  const buf = samples.get(name);
  if (!buf) return !missing.has(name);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = o.rate ?? 1;
  const g = ctx.createGain();
  g.gain.value = o.gain ?? 0.8;
  src.connect(g);
  route(g, o);
  src.start(ctx.currentTime + (o.when ?? 0));
  return true;
}

export function setSound(on: boolean) {
  enabled = on;
  if (on) ensure();
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.05);
  if (!on) music.stop();
}

interface Out {
  when?: number;
  pan?: number;
  /** Reverb send, 0–1 */
  verb?: number;
  dest?: AudioNode;
}

function route(node: AudioNode, o: Out) {
  if (!ctx || !master) return;
  let tail: AudioNode = node;
  if (o.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = o.pan;
    tail = tail.connect(p);
  }
  tail.connect(o.dest ?? master);
  if (o.verb && verbIn) {
    const s = ctx.createGain();
    s.gain.value = o.verb;
    tail.connect(s).connect(verbIn);
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, o: Out & { slide?: number; attack?: number } = {}) {
  if (!enabled || !ensure() || !ctx) return;
  const t = ctx.currentTime + (o.when ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  route(g, o);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function hiss(dur: number, gain: number, type: BiquadFilterType, freq: number, o: Out & { sweep?: number; q?: number; attack?: number; buf?: AudioBuffer | null } = {}) {
  if (!enabled || !ensure() || !ctx || !white) return;
  const t = ctx.currentTime + (o.when ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = o.buf ?? white;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(freq, t);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + (o.attack ?? 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  route(g, o);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

function buzz(ms: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(ms);
}

/** A bell: two sines at an inharmonic ratio, the way struck metal rings. */
function bell(freq: number, dur: number, gain: number, o: Out = {}) {
  tone(freq, dur, "sine", gain, { ...o, verb: o.verb ?? 0.5 });
  tone(freq * 2.76, dur * 0.5, "sine", gain * 0.35, { ...o, verb: o.verb ?? 0.5 });
  tone(freq * 5.4, dur * 0.25, "sine", gain * 0.15, o);
}

export const sfx = {
  /** The bill sheet comes out */
  sheet: () => void sample("paper", { gain: 0.7 }),
  /** The APPROVED stamp */
  approved: () => void sample("stamp-approved", { gain: 1, verb: 0.2 }),
  /** You got in: the club's band hits a sting */
  gotIn: () => void sample("win", { gain: 0.75, verb: 0.15 }),
  /** Out of messages and turned away */
  turnedAway: () => void sample("turned-away", { gain: 0.7 }),
  /** The vault paid: chips land, then the steel-drum sting */
  paid: () => {
    sample("paid-chips", { gain: 0.9 });
    sample("paid", { gain: 0.75, when: 0.35 });
  },
  /** Coins in the hand: Collect */
  coins: () => void sample("coins", { gain: 0.8 }),
  /** A toggle or small tap */
  tap: () => void sample("tap", { gain: 0.5 }),
  /** Something went wrong */
  error: () => void sample("error", { gain: 0.6 }),
  /** Spending a message: a ticket punch */
  chip: () => {
    if (sample("chip", { gain: 0.7 })) return;
    tone(2200, 0.012, "square", 0.05);
    tone(190, 0.08, "sine", 0.3, { slide: 90 });
    hiss(0.05, 0.12, "bandpass", 3000, { q: 2 });
  },
  /** A bill slid across to the bouncer: paper on wood */
  paper: () => {
    if (sample("hand-over", { verb: 0.1 })) return;
    hiss(0.42, 0.14, "bandpass", 900, { sweep: 3600, q: 1.4, attack: 0.08, verb: 0.15 });
    hiss(0.12, 0.08, "highpass", 5000, { when: 0.32 });
  },
  /** The bouncer's pen down the list */
  scratch: () => {
    if (sample("pen", { gain: 0.6 })) return;
    for (let i = 0; i < 6; i++) hiss(0.045, 0.07, "bandpass", 3800 + Math.random() * 900, { q: 6, when: i * 0.1 + Math.random() * 0.03 });
  },
  heartbeat: () => {
    tone(62, 0.14, "sine", 0.55, { slide: 44 });
    tone(55, 0.14, "sine", 0.4, { slide: 40, when: 0.17 });
  },
  /** REFUSED: the stamp comes down */
  thud: () => {
    if (sample("stamp-refused", { gain: 1, verb: 0.2 })) return;
    tone(1600, 0.01, "square", 0.08);
    tone(95, 0.3, "sine", 0.7, { slide: 38, verb: 0.25 });
    hiss(0.08, 0.35, "bandpass", 900, { q: 0.8 });
    hiss(0.25, 0.15, "lowpass", 400, { verb: 0.3 });
    buzz(70);
  },
  /** The rope comes off its post: brass on brass */
  clink: () => {
    bell(1960, 0.6, 0.08);
    bell(2620, 0.5, 0.06, { when: 0.08 });
    hiss(0.03, 0.08, "highpass", 6000);
  },
  /** A heavy door on old hinges */
  creak: () => {
    if (sample("door-open", { verb: 0.25 })) return;
    if (!enabled || !ensure() || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(110, t + 0.7);
    lfo.frequency.value = 23;
    lg.gain.value = 18;
    lfo.connect(lg).connect(o.frequency);
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(f).connect(g);
    route(g, { verb: 0.3 });
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.85);
    lfo.stop(t + 0.85);
  },
  /** Air rushing out as the door opens */
  whoosh: () => hiss(1.1, 0.14, "bandpass", 300, { sweep: 4200, q: 0.7, attack: 0.5, verb: 0.3 }),
  win: () => {
    [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(f, 1.2, 0.07, { when: i * 0.09 }));
    tone(65, 0.9, "sine", 0.5, { slide: 40, when: 0.05 });
    sfx.cheer(0.1);
    buzz([40, 60, 40, 60, 120]);
  },
  /** A room full of people going up */
  cheer: (when = 0) => {
    for (let i = 0; i < 4; i++) hiss(1.6, 0.05, "bandpass", 900 + i * 500, { q: 1.5, attack: 0.35, when: when + i * 0.05, verb: 0.4 });
  },
  tick: () => tone(2400, 0.02, "square", 0.025),
  /** Someone in the queue starts talking */
  pop: () => tone(520, 0.09, "sine", 0.12, { slide: 1100 }),
  /** A key on the phone keyboard */
  key: () => sample("key", { gain: 0.35, rate: 0.95 + Math.random() * 0.1 }) || hiss(0.018, 0.05, "bandpass", 2400 + Math.random() * 1600, { q: 3 }),
  /** Writing a note down */
  note: () => {
    hiss(0.07, 0.06, "bandpass", 4200, { q: 5 });
    hiss(0.05, 0.05, "bandpass", 4700, { q: 5, when: 0.09 });
  },
  /** A car goes past behind you, left to right */
  car: () => {
    if (!enabled || !ensure() || !ctx || !brown) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = brown;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(250, t);
    f.frequency.linearRampToValueAtTime(900, t + 1.2);
    f.frequency.linearRampToValueAtTime(300, t + 2.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.7);
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(-0.9, t);
    p.pan.linearRampToValueAtTime(0.9, t + 2.6);
    src.connect(f).connect(g).connect(p).connect(master!);
    src.start(t);
    src.stop(t + 2.8);
    hiss(2.4, 0.03, "highpass", 3000, { attack: 1.1, pan: 0 });
  },
  /** An okada buzzing past, right to left */
  moto: () => {
    if (!enabled || !ensure() || !ctx || !master) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(95, t + 1.6);
    o.frequency.linearRampToValueAtTime(62, t + 3.4);
    lfo.frequency.value = 31;
    lg.gain.value = 12;
    lfo.connect(lg).connect(o.frequency);
    f.type = "lowpass";
    f.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    p.pan.setValueAtTime(0.9, t);
    p.pan.linearRampToValueAtTime(-0.9, t + 3.5);
    o.connect(f).connect(g).connect(p).connect(master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 3.6);
    lfo.stop(t + 3.6);
  },
  /** A night bus pulling past: low diesel and a hiss of brakes */
  bus: () => {
    if (!enabled || !ensure() || !ctx || !master || !brown) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = brown;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 2.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(0.9, t);
    p.pan.linearRampToValueAtTime(-0.9, t + 6);
    src.connect(f).connect(g).connect(p).connect(master);
    src.start(t);
    src.stop(t + 6.1);
    tone(48, 5, "sawtooth", 0.03, { attack: 2 });
  },
  /** Somewhere down the road: a tro-tro horn in Accra, a siren in London */
  horn: () => {
    if (city === "quiet") return;
    if (city === "harbour") {
      tone(98, 2.4, "sawtooth", 0.02, { pan: 0.7, verb: 0.9, attack: 0.3 });
      tone(73, 2.4, "sine", 0.03, { pan: 0.7, verb: 0.9, attack: 0.3 });
      return;
    }
    if (city === "drums") {
      [0, 0.25, 0.5, 0.62, 0.75, 1].forEach((when, i) => tone(i % 3 === 2 ? 220 : 110, 0.14, "sine", 0.05, { pan: -0.5, verb: 0.5, when, slide: 60 }));
      return;
    }
    if (city === "london") {
      for (let i = 0; i < 4; i++) {
        tone(740, 0.45, "triangle", 0.012, { pan: 0.6, verb: 0.7, when: i * 0.9 });
        tone(587, 0.45, "triangle", 0.012, { pan: 0.6, verb: 0.7, when: i * 0.9 + 0.45 });
      }
      return;
    }
    tone(392, 0.22, "square", 0.012, { pan: -0.6, verb: 0.6 });
    tone(311, 0.3, "square", 0.012, { pan: -0.6, verb: 0.6, when: 0.26 });
  },
};

export interface Voice {
  base: number;
  spread: number;
  /** Formant scale: lower is a bigger chest */
  formant: number;
  gain: number;
}

export const VOICES = {
  sam: { base: 82, spread: 0.28, formant: 0.8, gain: 0.55 },
  crowd: { base: 150, spread: 0.6, formant: 1, gain: 0.12 },
} satisfies Record<string, Voice>;

// First two formants of a, e, i, o, u.
const VOWELS = [
  [730, 1090],
  [530, 1840],
  [300, 2200],
  [570, 840],
  [320, 900],
] as const;

/** A syllable of gibberish: a buzz shaped by two vowel formants, so it sounds like speech without words. */
export function babble(v: Voice, o: Out = {}) {
  if (!enabled || !ensure() || !ctx) return;
  const t = ctx.currentTime + (o.when ?? 0);
  const f0 = v.base * (1 + (Math.random() - 0.35) * v.spread);
  const [f1, f2] = VOWELS[Math.floor(Math.random() * VOWELS.length)]!;
  const src = ctx.createOscillator();
  src.type = "sawtooth";
  src.frequency.setValueAtTime(f0, t);
  src.frequency.exponentialRampToValueAtTime(f0 * 0.93, t + 0.09);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(v.gain, t + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  for (const [f, q, g] of [
    [f1 * v.formant, 7, 1],
    [f2 * v.formant, 9, 0.5],
  ] as const) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f;
    bp.Q.value = q;
    const gg = ctx.createGain();
    gg.gain.value = g;
    src.connect(bp).connect(gg).connect(out);
  }
  route(out, { verb: 0.08, ...o });
  src.start(t);
  src.stop(t + 0.12);
}

// ——— The street: rumble, the queue murmuring, a car now and then. ———

const ambience = (() => {
  let nodes: AudioScheduledSourceNode[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];
  let murmurGain: GainNode | null = null;
  function loop(src: AudioBuffer, type: BiquadFilterType, freq: number, gain: number) {
    if (!ctx || !master) return null;
    const s = ctx.createBufferSource();
    s.buffer = src;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(f).connect(g).connect(master);
    s.start();
    nodes.push(s);
    return g;
  }
  function every(min: number, max: number, fn: () => void) {
    const tick = () => {
      fn();
      timers.push(setTimeout(tick, (min + Math.random() * (max - min)) * 1000));
    };
    timers.push(setTimeout(tick, (min + Math.random() * (max - min)) * 1000));
  }
  return {
    start() {
      if (nodes.length || !ensure() || !white || !brown) return;
      loop(brown, "lowpass", 160, 0.09);
      murmurGain = loop(white, "bandpass", 650, 0.018);
      // The murmur swells and falls like a crowd does.
      every(0.3, 0.7, () => murmurGain && ctx && murmurGain.gain.setTargetAtTime(0.01 + Math.random() * 0.025, ctx.currentTime, 0.2));
      every(0.25, 0.9, () => babble(VOICES.crowd, { pan: Math.random() * 1.4 - 0.9, verb: 0.3 }));
      every(22, 40, sfx.horn);
    },
    stop() {
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {}
      });
      nodes = [];
      timers.forEach(clearTimeout);
      timers = [];
      murmurGain = null;
    },
  };
})();

// ——— The club behind the door: a four-bar loop heard through a wall. ———

type BeatFn = (accent: boolean) => void;
export type Room = "street" | "open" | "quiet";

const ROOMS: Record<Room, { cut: number; gain: number }> = {
  street: { cut: 280, gain: 0.6 },
  open: { cut: 16000, gain: 0.55 },
  quiet: { cut: 200, gain: 0.15 },
};

export const music = (() => {
  const BPM = 118;
  const step = 60 / BPM / 4;
  // Am7 · Fmaj7 · C/G · G6, one bar each
  const roots = [55, 43.65, 49, 49];
  const chords = [
    [220, 261.6, 329.6, 392],
    [174.6, 220, 261.6, 329.6],
    [196, 261.6, 329.6, 392],
    [196, 246.9, 293.7, 329.6],
  ];
  const arp = [0, 2, 1, 3, 2, 1, 3, 0];
  let timer: ReturnType<typeof setInterval> | null = null;
  let next = 0;
  let i = 0;
  let wall: BiquadFilterNode | null = null;
  let bus: GainNode | null = null;
  let duck: GainNode | null = null;
  let delay: DelayNode | null = null;
  let pluck: GainNode | null = null;
  let room: Room = "street";
  const listeners = new Set<BeatFn>();

  function kick(t: number) {
    if (!ctx || !bus) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.36);
    // Sidechain: the pad ducks under every kick, which is what makes it pump.
    duck?.gain.setValueAtTime(0.25, t);
    duck?.gain.linearRampToValueAtTime(1, t + 0.22);
  }

  function hit(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1, verb = 0) {
    if (!ctx || !bus || !white) return;
    const s = ctx.createBufferSource();
    s.buffer = white;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    if (verb && verbIn) {
      const sg = ctx.createGain();
      sg.gain.value = verb;
      g.connect(sg).connect(verbIn);
    }
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  function voice(t: number, freq: number, dur: number, type: OscillatorType, gain: number, cut: number, dest: AudioNode, attack = 0.005) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 14;
    f.type = "lowpass";
    f.frequency.setValueAtTime(cut, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function at(t: number, s: number) {
    if (!ctx || !bus || !duck || !pluck) return;
    const bar = Math.floor(s / 16) % 4;
    const b = s % 16;
    if (b % 4 === 0) {
      kick(t);
      const ms = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => listeners.forEach((fn) => fn(b === 0)), ms);
    }
    if (b === 4 || b === 12) {
      for (let k = 0; k < 3; k++) hit(t + k * 0.011, 0.04, 0.25, "bandpass", 1400, 1.2);
      hit(t + 0.033, 0.16, 0.18, "bandpass", 1300, 1, 0.35);
    }
    if (b % 4 === 2) hit(t, 0.035, 0.13, "highpass", 8000);
    else if (b % 2 === 1) hit(t, 0.02, 0.04, "highpass", 9000);
    if (b === 14 && bar % 2 === 1) hit(t, 0.22, 0.08, "highpass", 7000);
    if (b % 4 === 2) {
      voice(t, roots[bar]!, step * 1.8, "sawtooth", 0.3, 520, bus);
      voice(t, roots[bar]!, step * 1.8, "sine", 0.35, 200, bus);
    }
    if (b === 0) chords[bar]!.forEach((f) => [-1, 1].forEach(() => voice(t, f, step * 16, "sawtooth", 0.025, 1500, duck!, 0.25)));
    // A pluck arpeggio, dotted-eighth echo: barely there through the wall, it's what you hear when the door opens.
    if (b % 2 === 0 && [0, 3, 6, 10, 12, 14].includes(b)) voice(t, chords[bar]![arp[(b / 2) % 8]!]! * 2, 0.22, "triangle", 0.07, 3000, pluck);
  }

  function setRoom(r: Room, secs: number) {
    room = r;
    if (!ctx || !wall || !bus) return;
    const t = ctx.currentTime;
    wall.frequency.cancelScheduledValues(t);
    wall.frequency.setValueAtTime(wall.frequency.value, t);
    wall.frequency.exponentialRampToValueAtTime(ROOMS[r].cut, t + secs);
    bus.gain.setTargetAtTime(ROOMS[r].gain, t, secs / 3);
  }

  return {
    onBeat(fn: BeatFn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    start(r: Room = room) {
      if (!enabled || timer || !ensure() || !ctx || !master || !verbIn) return;
      room = r;
      bus = ctx.createGain();
      bus.gain.value = ROOMS[r].gain;
      wall = ctx.createBiquadFilter();
      wall.type = "lowpass";
      wall.frequency.value = ROOMS[r].cut;
      wall.Q.value = 0.9;
      bus.connect(wall).connect(master);
      const send = ctx.createGain();
      send.gain.value = 0.12;
      wall.connect(send).connect(verbIn);
      duck = ctx.createGain();
      duck.connect(bus);
      delay = ctx.createDelay(1);
      delay.delayTime.value = step * 3;
      const fb = ctx.createGain();
      fb.gain.value = 0.35;
      delay.connect(fb).connect(delay);
      delay.connect(bus);
      // The pluck goes in dry as well as echoed.
      pluck = ctx.createGain();
      pluck.connect(bus);
      pluck.connect(delay);
      if (r === "street") ambience.start();
      next = ctx.currentTime + 0.1;
      i = 0;
      timer = setInterval(() => {
        if (!ctx) return;
        while (next < ctx.currentTime + 0.12) {
          at(next, i % 64);
          next += step;
          i++;
        }
      }, 25);
    },
    /** The door opens: the wall lifts and the music comes through clear. */
    open() {
      ambience.stop();
      setRoom("open", 1.3);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      ambience.stop();
      bus?.disconnect();
      bus = null;
      wall = null;
      duck = null;
      delay = null;
      pluck = null;
    },
  };
})();
