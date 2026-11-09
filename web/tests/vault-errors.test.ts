import assert from "node:assert/strict";
import test from "node:test";
import { reasonOf } from "../lib/vault-errors.ts";

test("a known panic reason becomes a sentence", () => {
  assert.equal(reasonOf({ Failure: { ActionError: { kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: empty pot" } } } } }), "The pot is empty. Fund the vault first.");
  assert.equal(reasonOf("Smart contract panicked: attach near"), "Not enough NEAR was attached for the storage this call needs.");
});

test("an unknown reason, a bare trap, or nothing never shows raw text", () => {
  for (const input of ["Smart contract panicked: something new", "WebAssembly trap: An `unreachable` opcode was executed.", "", null, undefined]) {
    assert.equal(reasonOf(input), "The vault refused this. Nothing was changed.");
  }
});

test("a sponsor's own claim reads as a sentence", () => {
  assert.equal(reasonOf({ ActionError: { kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: sponsor cannot claim" } } } }), "A door's sponsor or the vault owner cannot be paid from it.");
});
