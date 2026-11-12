import assert from "node:assert/strict";
import test from "node:test";
import { SCORE_MIX, stateForLeft } from "../lib/score-mix.ts";
import { chordAt, DEFAULT_STYLE, nextBoundary, noteInRegister, styleForPosters } from "../lib/score.ts";
import { SCORE_STYLES } from "../lib/score-styles.ts";

test("each door's posters pick a style, and anything else plays the default", () => {
  assert.equal(styleForPosters("techno"), "techno");
  assert.equal(styleForPosters("amapiano"), "amapiano");
  assert.equal(styleForPosters("carnival"), "soca");
  assert.equal(styleForPosters("london"), "garage");
  assert.equal(styleForPosters("jazz"), "jazz");
  assert.equal(styleForPosters("comedy"), "pop");
  assert.equal(styleForPosters("accra"), DEFAULT_STYLE);
  assert.equal(styleForPosters(undefined), DEFAULT_STYLE);
  assert.equal(styleForPosters("not-a-poster"), DEFAULT_STYLE);
});

test("every poster pack has exactly one style", () => {
  const posters = Object.values(SCORE_STYLES).map((s) => s.posters);
  assert.equal(new Set(posters).size, posters.length);
});

test("a cue waits for the next grid line, never one already passed", () => {
  assert.equal(nextBoundary(0.5, 0, 0.25, 0), 0.5);
  assert.equal(nextBoundary(0.51, 0, 0.25, 0), 0.75);
  assert.equal(nextBoundary(0.49, 0, 0.25, 0.02), 0.75);
  assert.equal(nextBoundary(10.1, 10, 2, 0), 12);
  // Before the score has started, the first grid line is its start.
  assert.equal(nextBoundary(1, 5, 2, 0), 5);
});

test("the chord follows the bar and wraps with the loop", () => {
  const s = SCORE_STYLES.techno;
  const bar = s.loop / s.bars;
  assert.deepEqual(chordAt("techno", 0, 0), s.chords[0]);
  assert.deepEqual(chordAt("techno", bar * 4.5, 0), s.chords[4]);
  assert.deepEqual(chordAt("techno", s.loop + bar * 6.1, 0), s.chords[6]);
  assert.deepEqual(chordAt("techno", 3, 10), s.chords[0]);
});

test("a voice's note is a chord tone inside its register", () => {
  const chord = [57, 60, 64, 67];
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const m = noteInRegister(chord, 50, 64, r);
    assert.ok(m >= 50 && m <= 64, `${m} out of range`);
    assert.ok(chord.some((c) => (c - m) % 12 === 0), `${m} not a chord tone`);
  }
});

test("the night builds as messages run down, and the last one is the lull", () => {
  assert.equal(stateForLeft(6, 6), "left6");
  assert.equal(stateForLeft(5, 6), "left5");
  assert.equal(stateForLeft(4, 6), "left4");
  assert.equal(stateForLeft(3, 6), "left3");
  assert.equal(stateForLeft(2, 6), "left2");
  assert.equal(stateForLeft(1, 6), "left1");
  assert.equal(stateForLeft(0, 6), "left1");
  assert.equal(stateForLeft(3, 3), "left6");
});

test("the lull keeps only the clock and the pad, and getting in opens the wall", () => {
  assert.deepEqual(Object.keys(SCORE_MIX.left1.gains).sort(), ["bass", "pad", "tick"]);
  assert.equal(SCORE_MIX.inside.wall, 20000);
  assert.ok(SCORE_MIX.street.wall < 1000);
  assert.ok(!("tick" in SCORE_MIX.inside.gains));
});
