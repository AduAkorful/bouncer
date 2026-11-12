import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { SAMPLE_NAMES } from "../lib/sfx.ts";
import { SCORE_STEMS, SCORE_STINGERS, SCORE_STYLES } from "../lib/score-styles.ts";

const DIR = new URL("../public/audio/", import.meta.url);

test("every recorded sound the game plays has both formats and a credit line", () => {
  const credits = readFileSync(new URL("AUDIO_CREDITS.md", DIR), "utf8");
  for (const name of SAMPLE_NAMES) {
    assert.ok(existsSync(new URL(`${name}.ogg`, DIR)), `${name}.ogg`);
    assert.ok(existsSync(new URL(`${name}.m4a`, DIR)), `${name}.m4a`);
    assert.match(credits, new RegExp(`\\\`${name}\\.ogg\\\`.*\\| CC0 \\|`), `${name} credit`);
  }
});

test("no audio file ships without being played and credited", () => {
  const names = new Set<string>(SAMPLE_NAMES);
  for (const file of readdirSync(DIR)) {
    if (file === "AUDIO_CREDITS.md" || file === "score") continue;
    assert.ok(names.has(file.replace(/\.(ogg|m4a)$/, "")), file);
  }
});

test("every door style has every stem and stinger in both formats, and nothing else", () => {
  const credits = readFileSync(new URL("AUDIO_CREDITS.md", DIR), "utf8");
  assert.match(credits, /`score\/`/);
  const want = new Set([...SCORE_STEMS, ...SCORE_STINGERS].flatMap((n) => [`${n}.ogg`, `${n}.m4a`]));
  for (const style of Object.keys(SCORE_STYLES)) {
    const dir = new URL(`score/${style}/`, DIR);
    for (const f of want) assert.ok(existsSync(new URL(f, dir)), `${style}/${f}`);
    for (const f of readdirSync(dir)) assert.ok(want.has(f), `${style}/${f} is not played`);
  }
  assert.deepEqual(readdirSync(new URL("score/", DIR)).sort(), Object.keys(SCORE_STYLES).sort());
});
