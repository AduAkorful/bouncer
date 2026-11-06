import assert from "node:assert/strict";
import test from "node:test";
import { doorPaths, unreadDoor } from "./door-read.ts";

test("a missing id is not a failed read", () => {
  for (const error of ["id", "missing vault", "no story"]) {
    assert.deepEqual(unreadDoor(error, "qa-coast-05"), {
      label: "qa-coast-05",
      title: "There is no door with that id.",
      detail: "Nothing on this door was filled in.",
      retry: false,
    });
  }
});

test("a failed read can be tried again and keeps a safe id", () => {
  for (const error of ["vault", "spec", "token", "rpc"]) {
    const copy = unreadDoor(error, "qa-coast-05");
    assert.equal(copy.retry, true);
    assert.equal(copy.label, "qa-coast-05");
    assert.equal(copy.title, "This door could not be read.");
    assert.equal(copy.detail, "Nothing on this door was filled in.");
  }
  assert.equal(unreadDoor("vault").label, null);
});

test("a disconnected door does not offer a retry", () => {
  assert.deepEqual(unreadDoor("unset", "qa-coast-05"), {
    label: "qa-coast-05",
    title: "This door is not connected.",
    detail: "Nothing on this door was filled in.",
    retry: false,
  });
});

test("an unsafe id is not echoed or placed in a path", () => {
  assert.equal(unreadDoor("vault", "qa coast <05>").label, null);
  assert.equal(unreadDoor("id", "bad/id").label, null);
  assert.deepEqual(doorPaths("bad id!"), { door: "/home", play: "/play", reveal: "/reveal", claim: "/claim" });
});

test("a sponsored door keeps its own pages", () => {
  assert.deepEqual(doorPaths("qa-coast-05"), {
    door: "/v/qa-coast-05",
    play: "/v/qa-coast-05/play",
    reveal: "/v/qa-coast-05/reveal",
    claim: "/v/qa-coast-05/claim",
  });
  assert.deepEqual(doorPaths(), { door: "/home", play: "/play", reveal: "/reveal", claim: "/claim" });
});
