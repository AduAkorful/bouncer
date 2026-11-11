import assert from "node:assert/strict";
import test from "node:test";
import { ADJECTIVES, ANIMALS, NAME_SPACE, generatedPlayerName } from "../src/name-pick.ts";
import { playerNameToStore } from "../../web/lib/player-name.ts";

test("a generated name is an adjective, an animal and a number, and a typed name would be accepted", () => {
  for (let i = 0; i < 2000; i += 1) {
    const name = generatedPlayerName();
    assert.match(name, /^[A-Z][a-z]+[A-Z][a-z]+([2-9]|[1-9][0-9])$/);
    assert.ok(name.length <= 21);
    assert.equal(playerNameToStore(name), name);
  }
});

test("a pair too long to fit is drawn again", () => {
  const longest = (list: string[]) => list.reduce((best, word, index) => (word.length > list[best]!.length ? index : best), 0);
  // First draw: the longest adjective and animal, which cannot fit; second draw: the first words.
  const draws = [longest(ADJECTIVES), longest(ANIMALS), 0, 0, 0, 0];
  let calls = 0;
  const name = generatedPlayerName(() => draws[calls++] ?? 0);
  assert.ok(calls > 3);
  assert.equal(name, generatedPlayerName(() => 0));
});

test("left-out words never appear, and there are millions of names", () => {
  const names = new Set<string>();
  for (let i = 0; i < 5000; i += 1) names.add(generatedPlayerName());
  for (const name of names) assert.doesNotMatch(name, /^(Fat|Deaf|Stupid|Ugly|Gay|Drunk|Sick)[A-Z]/);
  assert.ok(names.size > 4950);
  assert.ok(NAME_SPACE > 10_000_000);
});
