/**
 * The game's score: each door's style as eight looping stems, started together on one clock, with their
 * volumes and the club wall following the raid. Stingers land on the next eighth note, layer changes on the
 * next bar line, and the characters' voices are short notes from the chord playing at that moment.
 *
 * The audio is rendered offline and lives in public/audio/score/<style>/. Nothing loads before the player
 * turns sound on. A stem that fails to load is silent; if nothing loads, `ready` stays false and the caller
 * keeps its old sounds.
 */

import { SCORE_MIX, type ScoreState, type ScoreStem } from "./score-mix.ts";
import { SCORE_STEMS, SCORE_STINGERS, SCORE_STYLES } from "./score-styles.ts";
import type { PosterId } from "./street-kit";

export type StyleId = keyof typeof SCORE_STYLES;
export type Stinger = (typeof SCORE_STINGERS)[number];

/** Afrobeats for Accra, and for every door whose card is older than the posters setting. */
export const DEFAULT_STYLE: StyleId = "afrobeats";

/** The style a door's posters ask for. */
export function styleForPosters(posters: PosterId | string | null | undefined): StyleId {
  for (const [id, s] of Object.entries(SCORE_STYLES)) if (s.posters === posters) return id as StyleId;
  return DEFAULT_STYLE;
}

/** The first multiple of `unit` after `t0` that is at least `lead` seconds after `now`. */
export function nextBoundary(now: number, t0: number, unit: number, lead = 0.02): number {
  const k = Math.ceil((now + lead - t0) / unit - 1e-9);
  return t0 + Math.max(0, k) * unit;
}

/** The chord playing at `time` in a score that started at `t0`. */
export function chordAt(style: StyleId, time: number, t0: number): readonly number[] {
  const s = SCORE_STYLES[style];
  const bar = s.loop / s.bars;
  const i = Math.floor(Math.max(0, time - t0) / bar) % s.bars;
  return s.chords[i]!;
}

/** A chord tone moved into [lo, hi]. `r` in [0, 1) picks which tone. */
export function noteInRegister(chord: readonly number[], lo: number, hi: number, r: number): number {
  const tone = chord[Math.min(chord.length - 1, Math.floor(r * chord.length))]!;
  let m = tone;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m < lo ? m + 12 : m;
}

type Beat = (accent: boolean) => void;

const ext = () => (typeof Audio !== "undefined" && new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "m4a");

/** One score per page. `out` is where the music goes: the page's master, after its compressor. */
export function createScore() {
  let ctx: AudioContext | null = null;
  let style: StyleId = DEFAULT_STYLE;
  let loadedFor: StyleId | null = null;
  let loading: Promise<boolean> | null = null;
  const stems = new Map<ScoreStem, AudioBuffer>();
  const stingers = new Map<Stinger, AudioBuffer>();
  let sources: AudioBufferSourceNode[] = [];
  const gains = new Map<ScoreStem, GainNode>();
  let wall: BiquadFilterNode | null = null;
  let bus: GainNode | null = null;
  let duck: GainNode | null = null;
  let out: AudioNode | null = null;
  let t0 = 0;
  let state: ScoreState = "street";
  let playing = false;
  let beatTimer: ReturnType<typeof setInterval> | null = null;
  let lastBeat = -1;
  const listeners = new Set<Beat>();

  const spec = () => SCORE_STYLES[style];
  const barLen = () => spec().loop / spec().bars;
  const beatLen = () => 60 / spec().bpm;

  async function load(c: AudioContext): Promise<boolean> {
    if (loadedFor === style && loading) return loading;
    loadedFor = style;
    stems.clear();
    stingers.clear();
    const e = ext();
    const base = `/audio/score/${style}`;
    const get = async (name: string) => {
      try {
        const res = await fetch(`${base}/${name}.${e}`);
        if (!res.ok) return null;
        return await c.decodeAudioData(await res.arrayBuffer());
      } catch {
        // A part that will not load is left out; the rest of the score still plays.
        return null;
      }
    };
    const want = style;
    loading = Promise.all([
      ...SCORE_STEMS.map(async (s) => { const b = await get(s); if (b && want === style) stems.set(s, b); }),
      ...SCORE_STINGERS.map(async (s) => { const b = await get(s); if (b && want === style) stingers.set(s, b); }),
    ]).then(() => stems.size > 0);
    return loading;
  }

  function apply(next: ScoreState, when: number, glide = 0.12) {
    if (!ctx || !wall) return;
    const mix = SCORE_MIX[next];
    for (const s of SCORE_STEMS) {
      const g = gains.get(s);
      if (!g) continue;
      g.gain.cancelScheduledValues(when);
      g.gain.setTargetAtTime((mix.gains as Partial<Record<ScoreStem, number>>)[s] ?? 0, when, glide);
    }
    wall.frequency.cancelScheduledValues(when);
    wall.frequency.setTargetAtTime(mix.wall, when, glide * 2);
  }

  function beats() {
    if (!ctx || !playing) return;
    const n = Math.floor((ctx.currentTime - t0) / beatLen());
    if (n === lastBeat || n < 0) return;
    lastBeat = n;
    const accent = n % 4 === 0;
    listeners.forEach((fn) => fn(accent));
  }

  return {
    /** True once this style's stems are decoded and playing. */
    get ready() {
      return playing;
    },
    get style() {
      return style;
    },
    /** Picks the door's style. A change while playing restarts the score in the new style. */
    setStyle(next: StyleId) {
      if (next === style) return;
      const was = playing;
      this.stop();
      style = next;
      if (was && ctx && out) void this.start(ctx, out, state);
    },
    onBeat(fn: Beat) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    /** Starts every stem together. Resolves false when nothing could be loaded. */
    async start(c: AudioContext, dest: AudioNode, from: ScoreState = "street"): Promise<boolean> {
      if (playing) return true;
      ctx = c;
      out = dest;
      const ok = await load(c);
      if (!ok || playing || ctx !== c) return playing;
      const s = spec();
      duck = c.createGain();
      bus = c.createGain();
      bus.gain.value = SCORE_MIX.musicGain;
      wall = c.createBiquadFilter();
      wall.type = "lowpass";
      wall.Q.value = 0.8;
      wall.frequency.value = SCORE_MIX[from].wall;
      duck.connect(wall).connect(bus).connect(dest);
      t0 = c.currentTime + 0.12;
      state = from;
      sources = [];
      for (const name of SCORE_STEMS) {
        const buf = stems.get(name);
        if (!buf) continue;
        const g = c.createGain();
        g.gain.value = (SCORE_MIX[from].gains as Partial<Record<ScoreStem, number>>)[name] ?? 0;
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.loopStart = s.pad;
        src.loopEnd = s.pad + s.loop;
        src.connect(g).connect(duck);
        src.start(t0, s.pad);
        gains.set(name, g);
        sources.push(src);
      }
      playing = true;
      lastBeat = -1;
      beatTimer = setInterval(beats, 30);
      return true;
    },
    /** Moves to a state on the next bar line. */
    set(next: ScoreState) {
      if (next === state) return;
      state = next;
      if (!ctx || !playing) return;
      apply(next, nextBoundary(ctx.currentTime, t0, barLen(), 0.05));
    },
    get state() {
      return state;
    },
    /** Plays a stinger on the next eighth note. A refusal also ducks the music for one bar. Returns false if it could not play. */
    cue(name: Stinger, opts: { onBar?: boolean; then?: ScoreState } = {}): boolean {
      const buf = stingers.get(name);
      if (!ctx || !playing || !buf || !bus) return false;
      const unit = opts.onBar ? barLen() : beatLen() / 2;
      const when = nextBoundary(ctx.currentTime, t0, unit, 0.03);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = SCORE_MIX.stingerGain / SCORE_MIX.musicGain;
      // Stingers join after the wall: they are the game talking, not the club.
      src.connect(g).connect(bus);
      src.start(when);
      if (name === "refuse" && duck) {
        duck.gain.cancelScheduledValues(when);
        duck.gain.setTargetAtTime(SCORE_MIX.refuseDuck, when, 0.03);
        duck.gain.setTargetAtTime(1, when + barLen(), 0.2);
      }
      if (opts.then) {
        state = opts.then;
        apply(opts.then, when, 0.04);
      }
      return true;
    },
    /** Lets the music fall away over `secs`, then stops it. */
    fade(secs = 4) {
      if (!ctx || !bus || !playing) return;
      bus.gain.setTargetAtTime(0, ctx.currentTime, secs / 4);
      const done = bus;
      setTimeout(() => { if (bus === done) this.stop(); }, secs * 1000 + 200);
    },
    /** The chord now, for the voices. Before the score plays, the style's first chord. */
    chordNow(): readonly number[] {
      return chordAt(style, ctx?.currentTime ?? 0, playing ? t0 : 0);
    },
    stop() {
      if (beatTimer) clearInterval(beatTimer);
      beatTimer = null;
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          // Already stopped.
        }
      }
      sources = [];
      gains.clear();
      bus?.disconnect();
      bus = null;
      wall = null;
      duck = null;
      playing = false;
    },
  };
}
