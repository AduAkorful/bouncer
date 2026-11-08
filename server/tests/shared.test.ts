import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The server imports these from web/lib. They must not reach into Next or the web app's alias.
const SHARED = [
  "config", "chain", "guard-turn", "marks", "relay", "sponsor-views", "verdict-turn", "vault", "preflight", "vault-calls",
  "passkey-sponsor", "passkey-account", "submit-verdict", "token", "storage-cost",
];

test("the pure modules the server shares import nothing from Next or the web alias", () => {
  for (const name of SHARED) {
    const text = readFileSync(new URL(`../../web/lib/${name}.ts`, import.meta.url), "utf8");
    assert.equal(/from\s+["']next/.test(text), false, `${name} imports next`);
    assert.equal(/from\s+["']@\//.test(text), false, `${name} imports the web alias`);
    assert.equal(/from\s+["']react/.test(text), false, `${name} imports react`);
  }
});
