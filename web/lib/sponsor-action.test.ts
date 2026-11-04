import assert from "node:assert/strict";
import test from "node:test";
import { runSponsorAction, sponsorDetail } from "./sponsor-action.ts";

test("a rejected sponsor action becomes a safe visible notice and releases the controls", async () => {
  const events: unknown[] = [];
  await runSponsorAction(async () => { throw new Error("private internal detail"); }, {
    busy: (value) => events.push(["busy", value]),
    notice: (value) => events.push(["notice", value]),
  });
  assert.deepEqual(events, [["busy", true], ["notice", null], ["notice", "This step did not finish. Try again."], ["busy", false]]);
});

test("intentional failure and success messages are preserved and a retry can clear them", async () => {
  let busy = false;
  let notice: string | null = null;
  const state = { busy: (value: boolean) => { busy = value; }, notice: (value: string | null) => { notice = value; } };
  for (const message of ["The test did not run.", "Draft ready.", null]) {
    await runSponsorAction(async () => message, state);
    assert.equal(notice, message);
    assert.equal(busy, false);
  }
});

test("synchronous signing failures are also caught without exposing the exception", async () => {
  let notice: string | null = null;
  await runSponsorAction(() => { throw new Error("signing internals"); }, {
    busy: () => {}, notice: (value) => { notice = value; },
  });
  assert.equal(notice, "This step did not finish. Try again.");
});

test("malformed server details cannot become a broken React notice", () => {
  for (const body of [null, [], { detail: {} }, { detail: 4 }, { detail: "" }]) {
    assert.equal(sponsorDetail(body, "Try again."), "Try again.");
  }
  assert.equal(sponsorDetail({ detail: "The spec is too large." }, "Try again."), "The spec is too large.");
});
