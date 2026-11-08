import assert from "node:assert/strict";
import test from "node:test";
import type { GuardEnv } from "../lib/config.ts";
import { runGuardTurn } from "../lib/guard-turn.ts";
import type { Mark } from "../lib/marks.ts";

const env: GuardEnv = {
  callUrl: "https://relay.example/call/owner/project",
  paymentKey: "owner:1:secret",
  versionKey: "ab".repeat(32),
  maxExecutionSeconds: 120,
  maxMemoryMb: 128,
};

test("a second open and a stale blob make no outbound request", async () => {
  const marks = new Map<string, Mark>();
  let calls = 0;
  const post = async () => {
    calls += 1;
    return { ok: true as const, body: { ok: true, blob: "blob-a" } };
  };
  const open = { op: "open", vault_id: "velvet-1", round: 1, player_id: "player-1" };
  const first = await runGuardTurn(env, marks, open, post);
  assert.equal(first.called, true);
  assert.equal(calls, 1);
  const advance = await runGuardTurn(env, marks, { op: "say", vault_id: "velvet-1", round: "1", player_id: "player-1", blob: "blob-a" }, async () => {
    calls += 1;
    return { ok: true as const, body: { ok: true, blob: "blob-b" } };
  });
  assert.equal(advance.called, true);
  const second = await runGuardTurn(env, marks, open, post);
  assert.equal(second.called, false);
  assert.deepEqual(second.body, { ok: false, error: "second open" });
  const stale = await runGuardTurn(
    env,
    marks,
    { op: "say", vault_id: "velvet-1", round: "1", player_id: "player-1", blob: "other" },
    post,
  );
  assert.equal(stale.called, false);
  assert.equal(calls, 2);
});
