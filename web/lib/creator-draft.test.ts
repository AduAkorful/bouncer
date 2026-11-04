import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DRAFT, parseCreatorDraft } from "./creator-draft.ts";

test("a saved cosmetic draft restores all edited fields", () => {
  const draft = { ...DEFAULT_DRAFT, look: { ...DEFAULT_DRAFT.look, name: "Ama", catchphrase: "Invoice?" }, sign: "NIGHT SHIFT", city: "london", neon: "uv", sound: true };
  assert.deepEqual(parseCreatorDraft(JSON.stringify(draft)), draft);
});

test("corrupt, unsupported and locked cosmetic drafts are refused", () => {
  for (const value of ["{", "null", JSON.stringify({ ...DEFAULT_DRAFT, version: 2 }),
    JSON.stringify({ ...DEFAULT_DRAFT, city: "unknown" }),
    JSON.stringify({ ...DEFAULT_DRAFT, look: { ...DEFAULT_DRAFT.look, outfit: "irongate" } }),
    JSON.stringify({ ...DEFAULT_DRAFT, look: { ...DEFAULT_DRAFT.look, skin: -1 } })]) {
    assert.throws(() => parseCreatorDraft(value));
  }
});
