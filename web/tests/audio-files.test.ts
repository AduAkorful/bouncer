import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { SAMPLE_NAMES } from "../lib/sfx.ts";

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
    if (file === "AUDIO_CREDITS.md") continue;
    assert.ok(names.has(file.replace(/\.(ogg|m4a)$/, "")), file);
  }
});
