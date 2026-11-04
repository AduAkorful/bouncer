/**
 * The keeper loop. For every vault whose keeper is this account it closes an expired round and opens
 * the next one. It cannot move funds, by the contract. Every step is safe to repeat: a vault that is
 * already open is skipped, and a failed vault backs off.
 */

import { commitRound, GAS, type Call } from "../../web/lib/vault-calls.ts";
import { preflightCommit } from "../../web/lib/preflight.ts";
import type { LimitsView } from "../../web/lib/sponsor-views.ts";
import type { VaultView } from "../../web/lib/vault.ts";
import type { Commit } from "./commit-flow.ts";

export type KeeperChain = {
  contractId: string;
  listVaults(from: number, limit: number): Promise<string[] | null>;
  readVault(id: string): Promise<VaultView | null>;
  limits(): Promise<LimitsView | null>;
  owner(): Promise<string | null>;
  nowNs(): Promise<bigint | null>;
  commit(vaultId: string): Promise<{ ok: true; commit: Commit } | { ok: false; error: string }>;
  send(call: Call): Promise<{ ok: true; hash: string } | { ok: false; error: string }>;
};

export type Outcome = { at: number; action: "closed" | "opened" | "skipped" | "failed"; detail: string };

const PAGE = 100;
const MAX_ACTIONS = 25;
const BACKOFF_MS = 10 * 60_000;
/** A vault with no keeper is looked at again this often, in case its sponsor names one. */
const RECHECK_MS = 10 * 60_000;

export function createKeeper(chain: KeeperChain, keeperId: string, clock: () => number, log: (line: string) => void) {
  const outcomes = new Map<string, Outcome>();
  const backoff = new Map<string, number>();
  const notMine = new Map<string, number>();
  let running = false;

  const note = (id: string, action: Outcome["action"], detail: string) => {
    const before = outcomes.get(id);
    outcomes.set(id, { at: clock(), action, detail });
    // The same reason every minute is one line, not sixty.
    if (!before || before.action !== action || before.detail !== detail) log(`${id} ${action} ${detail}`);
  };

  async function handle(id: string, vault: VaultView, limits: LimitsView, owner: string): Promise<boolean> {
    let current = vault;
    const nowNs = await chain.nowNs();
    if (nowNs === null) {
      note(id, "skipped", "the chain time could not be read");
      return false;
    }
    let acted = false;
    if (current.open) {
      if (nowNs < BigInt(current.closesAt)) return false;
      const closed = await chain.send({
        receiverId: chain.contractId,
        method: "close_round",
        args: { vault_id: id },
        gas: GAS.keeper,
        depositYocto: 0n,
      });
      if (!closed.ok) return fail(id, `close_round: ${closed.error}`);
      note(id, "closed", closed.hash);
      acted = true;
      const again = await chain.readVault(id);
      if (!again) return acted;
      current = again;
    }
    if (current.open) return acted;
    // Everything the contract checks that needs no signature is checked first, so an empty or
    // suspended vault never spends a guard call.
    const check = preflightCommit({ limits, vault: current, owner, accountId: keeperId, nowNs, opensAtNs: nowNs, hasSignature: true });
    if (!check.ok) {
      note(id, "skipped", check.error);
      return acted;
    }
    const signed = await chain.commit(id);
    if (!signed.ok) {
      note(id, "skipped", signed.error);
      return acted;
    }
    const built = commitRound(chain.contractId, {
      vaultId: id,
      commitmentHex: signed.commit.commitment,
      guardVersionHex: signed.commit.guardVersion,
      opensAtNs: nowNs,
      signatureHex: signed.commit.signature,
    });
    if (!built.ok) return fail(id, `commit_round: ${built.error}`) || acted;
    const sent = await chain.send(built.call);
    if (!sent.ok) return fail(id, `commit_round: ${sent.error}`) || acted;
    note(id, "opened", `round ${signed.commit.round} ${sent.hash}`);
    return true;
  }

  function fail(id: string, detail: string): boolean {
    backoff.set(id, clock() + BACKOFF_MS);
    note(id, "failed", detail);
    return true;
  }

  async function pass(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const [limits, owner] = await Promise.all([chain.limits(), chain.owner()]);
      if (!limits || !owner) {
        log("pass skipped: the vault's limits or owner could not be read");
        return;
      }
      let actions = 0;
      for (let from = 0; ; from += PAGE) {
        const ids = await chain.listVaults(from, PAGE);
        if (ids === null) {
          log("pass stopped: the vault list could not be read");
          return;
        }
        for (const id of ids) {
          if (actions >= MAX_ACTIONS) return;
          const now = clock();
          if ((backoff.get(id) ?? 0) > now) continue;
          if ((notMine.get(id) ?? 0) > now) continue;
          const vault = await chain.readVault(id);
          if (!vault) continue;
          if (vault.keeper !== keeperId) {
            notMine.set(id, now + RECHECK_MS);
            continue;
          }
          if (await handle(id, vault, limits, owner)) actions += 1;
        }
        if (ids.length < PAGE) return;
      }
    } finally {
      running = false;
    }
  }

  return { pass, status: () => Object.fromEntries(outcomes) };
}
