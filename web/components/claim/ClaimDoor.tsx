"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { Countdown } from "@/components/Countdown";
import { Money, NetworkTag } from "@/components/bits";
import { unlockDevice, deriveSecrets } from "@/lib/device-pass";
import { readPayoutAccount, testnetAccountId, writePayoutAccount } from "@/lib/imported-account";
import { addWalletKey, sendClaim } from "@/lib/send-claim";
import { playableRaid } from "@/lib/door";
import { loadRaid } from "@/lib/session-store";
import { formatAtomic } from "@/lib/units";
import type { CrackView, VaultView } from "@/lib/vault";

type Phase = "locked" | "ready" | "paying" | "paid" | "closed";

export function ClaimDoor({
  vaultId,
  currency,
  decimals,
  storageName,
  networkTag,
  round,
  rpcUrl,
  contractId,
  networkId,
}: {
  vaultId: string;
  currency: string;
  decimals: number;
  storageName: string;
  networkTag: string;
  round: string;
  rpcUrl: string;
  contractId: string;
  networkId: string;
}) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [crack, setCrack] = useState<CrackView | null>(null);
  const [vault, setVault] = useState<VaultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<string | null>(null);
  const [raidId, setRaidId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [walletKey, setWalletKey] = useState("");
  const [keyNote, setKeyNote] = useState<string | null>(null);
  const [namedAccount, setNamedAccount] = useState("");
  const [preference, setPreference] = useState<"unset" | "new" | "existing">("unset");

  useEffect(() => {
    const stored = readPayoutAccount(window.localStorage, storageName);
    if (stored) {
      setNamedAccount(stored);
      setPreference("existing");
    }
  }, [storageName]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const raid = playableRaid(await loadRaid(storageName, vaultId, round));
      if (!raid || !("playerId" in raid)) {
        if (!cancel) {
          setMissing(true);
          setError(!raid ? "No raid is stored on this device." : "The door did not answer.");
        }
        return;
      }
      if (!cancel) setRaidId(raid.raidId);
      const sent = await apiPost("/crack", { raid_id: raid.raidId, vault_id: vaultId });
      const body = (sent.ok ? sent.body : null) as {
        ok?: boolean;
        error?: string;
        crack?: CrackView | null;
        nowMs?: number;
        vault?: VaultView;
      } | null;
      if (!body?.ok || !body.vault || typeof body.nowMs !== "number") {
        if (!cancel) setError("The vault did not answer.");
        return;
      }
      if (!body.crack) {
        if (!cancel) setError("No crack is recorded for this raid.");
        return;
      }
      if (!cancel) {
        setCrack(body.crack);
        setVault(body.vault);
        setPhase(phaseOf(body.crack, body.nowMs));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [storageName, vaultId, round]);

  useEffect(() => {
    if (phase !== "paying") return;
    let cancel = false;
    const look = async () => {
      if (cancel || !raidId) return;
      const sent = await apiPost("/crack", { raid_id: raidId, vault_id: vaultId });
      const body = (sent.ok ? sent.body : null) as { ok?: boolean; crack?: CrackView | null } | null;
      if (cancel || !body?.ok || !body.crack) return;
      setCrack(body.crack);
      if (body.crack.status === "Paid") setPhase("paid");
      if (body.crack.status === "Failed") {
        setPhase("ready");
        setError("The vault did not finish the payment. Claim again.");
      }
    };
    void look();
    const timer = setInterval(() => void look(), 4000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [phase, raidId]);

  async function readCrack(id: string) {
    const sent = await apiPost("/crack", { raid_id: id, vault_id: vaultId });
    const body = (sent.ok ? sent.body : null) as {
      ok?: boolean;
      crack?: CrackView | null;
      nowMs?: number;
      vault?: VaultView;
    } | null;
    if (!body?.ok || !body.vault || typeof body.nowMs !== "number") {
      setError("The vault did not answer.");
      return;
    }
    if (!body.crack) {
      setError("No crack is recorded for this raid.");
      return;
    }
    setMissing(false);
    setCrack(body.crack);
    setVault(body.vault);
    setPhase(phaseOf(body.crack, body.nowMs));
    setError(null);
  }

  async function recover() {
    setBusy(true);
    setError(null);
    const unlocked = await unlockDevice();
    if ("error" in unlocked) {
      setBusy(false);
      setError(unlocked.error);
      return;
    }
    const secrets = await deriveSecrets(unlocked.ikm, vaultId, round);
    unlocked.ikm.fill(0);
    setBusy(false);
    if ("error" in secrets) {
      setError("This phone cannot keep a key in the passkey.");
      return;
    }
    setRaidId(secrets.raidId);
    await readCrack(secrets.raidId);
  }

  function payoutChoice(): string | null | "invalid" {
    if (preference === "new") return null;
    const raw = preference === "existing" ? namedAccount : (readPayoutAccount(window.localStorage, storageName) ?? "");
    if (!raw.trim()) return null;
    return testnetAccountId(raw) ?? "invalid";
  }

  async function claim() {
    if (!raidId) {
      setError("No raid is stored on this device.");
      return;
    }
    const chosen = payoutChoice();
    if (chosen === "invalid") {
      setError("That account name cannot be used.");
      return;
    }
    setBusy(true);
    setError(null);
    const sent = await sendClaim({
      vaultId,
      contractId,
      round,
      raidId,
      rpcUrl,
      networkId,
      accountId: chosen,
    });
    setBusy(false);
    if (!sent.ok) {
      setError(sent.error);
      return;
    }
    writePayoutAccount(window.localStorage, storageName, chosen);
    setPayoutAccount(sent.accountId);
    setPhase("paying");
  }

  async function addKey() {
    if (!raidId || !payoutAccount) return;
    setBusy(true);
    setKeyNote(null);
    const added = await addWalletKey({
      vaultId,
      round,
      raidId,
      rpcUrl,
      networkId,
      accountId: payoutAccount,
      walletPublicKey: walletKey,
    });
    setBusy(false);
    setKeyNote(added.ok ? "That key can use this account." : added.error);
  }

  const amount = crack ? formatAtomic(crack.amount, decimals) : null;

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Payout</p>
          <NetworkTag label={networkTag} className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Your cut</h1>
        {amount ? <Money text={amount} currency={currency} className="mt-3 text-4xl text-brass" /> : null}
        {error ? <p className="mt-4 text-sm text-chalk/70">{error}</p> : phase === null && !missing ? <p className="mt-4 text-sm text-chalk/70">Reading this claim.</p> : null}
        {missing && (
          <button disabled={busy} onClick={() => void recover()} className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
            {busy ? "Waiting for this phone" : "Use this phone's passkey"}
          </button>
        )}
        {phase === "locked" && crack && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5 text-center">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Time lock</div>
            <Countdown endsAtNs={crack.unlockAt} className="mt-2 text-3xl text-chalk" />
            <p className="mt-2 text-sm text-chalk/60">The vault pays when this lock opens. Other chains stay labelled for later and are not payable here.</p>
          </section>
        )}
        {phase === "ready" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="text-sm text-chalk/70">
              {preference === "existing" && namedAccount.trim()
                ? `The lock is open. This phone's passkey signs the claim, and the vault pays ${namedAccount.trim()}.`
                : "The lock is open. Claim uses a passkey on this phone. That account is the payout, and the vault sends the tUSDC there."}
            </p>
            {preference === "existing" && (
              <>
                <input
                  value={namedAccount}
                  onChange={(event) => setNamedAccount(event.target.value)}
                  placeholder="name.testnet"
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm"
                />
                <p className="mt-2 text-sm text-chalk/60">This phone's passkey has to be a full-access key on that account. The account pays the gas.</p>
              </>
            )}
            <button disabled={busy} onClick={() => void claim()} className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
              {busy ? "Waiting for the passkey" : "Claim"}
            </button>
            {preference === "existing" ? (
              <button type="button" onClick={() => setPreference("new")} className="mt-3 w-full text-sm text-chalk/70 underline decoration-white/20">
                Use a new account
              </button>
            ) : (
              <button type="button" onClick={() => setPreference("existing")} className="mt-3 w-full text-sm text-chalk/70 underline decoration-white/20">
                Use an account you already have
              </button>
            )}
          </section>
        )}
        {phase === "paying" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="font-sign text-2xl">The vault is paying.</p>
          </section>
        )}
        {phase === "paid" && (
          <section className="mt-5">
            <p className="font-sign text-2xl">Paid.</p>
          </section>
        )}
        {phase === "closed" && <p className="mt-5 text-sm text-chalk/70">This crack can no longer be claimed.</p>}
        {payoutAccount && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="break-all font-mono text-[12px] text-chalk/70">{payoutAccount}</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(payoutAccount)}
              className="mt-3 rounded-2xl border border-chalk/30 px-4 py-2 text-sm"
            >
              Copy account
            </button>
            {preference !== "existing" && (
              <>
                <p className="mt-4 text-sm text-chalk/70">The key stays on this phone. Paste a wallet public key to use this account there.</p>
                <input
                  value={walletKey}
                  onChange={(event) => setWalletKey(event.target.value)}
                  placeholder="ed25519:"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm"
                />
                <button disabled={busy || !walletKey.trim()} onClick={() => void addKey()} className="mt-3 w-full rounded-2xl border border-chalk/30 py-3 text-sm disabled:opacity-40">
                  Add this key
                </button>
                {keyNote ? <p className="mt-3 text-sm text-chalk/70">{keyNote}</p> : null}
              </>
            )}
          </section>
        )}
        {vault && <p className="mt-4 font-mono text-xs text-chalk/80">Round {vault.round}</p>}
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}

function phaseOf(crack: CrackView, nowMs: number): Phase {
  if (crack.status === "Paid") return "paid";
  if (crack.status === "Pending") return "paying";
  const unlockMs = Number(BigInt(crack.unlockAt) / 1_000_000n);
  const expiresMs = Number(BigInt(crack.expiresAt) / 1_000_000n);
  if (!Number.isSafeInteger(unlockMs) || !Number.isSafeInteger(expiresMs)) return "closed";
  if (nowMs < unlockMs) return "locked";
  if (nowMs > expiresMs) return "closed";
  if (crack.status === "Reserved" || crack.status === "Settled" || crack.status === "Failed") return "ready";
  return "closed";
}
