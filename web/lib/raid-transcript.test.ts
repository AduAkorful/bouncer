import test from "node:test";
import assert from "node:assert/strict";
import { parseTranscript } from "./raid-transcript.ts";
test("transcripts accept only bounded complete exchanges", () => {
  assert.deepEqual(parseTranscript([{ player: "Hello", guard: "Evening" }]), [{ player: "Hello", guard: "Evening" }]);
  for (const bad of [null, {}, [{ player: "hi" }], [{ player: "", guard: "hi" }], Array(13).fill({ player: "a", guard: "b" }), [{ player: "a".repeat(2001), guard: "b" }]]) assert.throws(() => parseTranscript(bad));
});
