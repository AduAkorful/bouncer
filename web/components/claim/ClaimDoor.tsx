"use client";

import { useEffect, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { Money, NetworkTag } from "@/components/bits";
import { sendClaim } from "@/lib/send-claim";
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
  authClientId,
  authContractId,
  mpcContractId,
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
  authClientId: string;
  authContractId: string;
  mpcContractId: string;
}) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [crack, setCrack] = useState<CrackView | null>(null);
  const [vault, setVault] = useState<VaultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const raid = await loadRaid(storageName, vaultId, round);
      if (!raid || !("playerId" in raid)) {
        if (!cancel) setError(!raid ? "No raid is stored on this device." : raid.error);
        return;
      }
      const response = await fetch("/api/crack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raid_id: raid.raidId }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        crack?: CrackView | null;
        nowMs?: number;
        vault?: VaultView;
      } | null;
      if (!body?.ok || !body.vault || typeof body.nowMs !== "number") {
        if (!cancel) setError(body?.error ?? "crack");
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
      const raid = await loadRaid(storageName, vaultId, round);
      if (cancel || !raid || !("playerId" in raid)) return;
      const response = await fetch("/api/crack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raid_id: raid.raidId }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; crack?: CrackView | null } | null;
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
  }, [phase, storageName, vaultId, round]);

  async function claim() {
    const raid = await loadRaid(storageName, vaultId, round);
    if (!raid || !("playerId" in raid)) {
      setError(!raid ? "No raid is stored on this device." : raid.error);
      return;
    }
    setBusy(true);
    setError(null);
    const sent = await sendClaim({
      storageName,
      vaultId,
      contractId,
      round,
      raidId: raid.raidId,
      rpcUrl,
      networkId,
      authClientId,
      authContractId,
      mpcContractId,
    });
    setBusy(false);
    if (!sent.ok) {
      setError(sent.error);
      return;
    }
    setPayoutAccount(sent.accountId);
    setPhase("paying");
  }

  const amount = crack ? formatAtomic(crack.amount, decimals) : null;

  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Payout</p>
          <NetworkTag label={networkTag} className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Your cut</h1>
        {amount ? <Money text={amount} currency={currency} className="mt-3 text-4xl text-brass" /> : null}
        {error && <p className="mt-4 text-sm text-chalk/70">{error}</p>}
        {phase === "locked" && crack && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Time lock</div>
            <Countdown endsAtNs={crack.unlockAt} className="mt-2 text-3xl text-chalk" />
            <p className="mt-2 text-sm text-chalk/60">The vault pays when this lock opens. Other chains stay labelled for later and are not payable here.</p>
          </section>
        )}
        {phase === "ready" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="text-sm text-chalk/70">The lock is open. Claim uses a passkey on this phone. That account is the payout, and the vault sends the tUSDC there.</p>
            <button disabled={busy} onClick={() => void claim()} className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
              {busy ? "Waiting for the passkey" : "Claim"}
            </button>
          </section>
        )}
        {phase === "paying" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="font-sign text-2xl">The vault is paying.</p>
            {payoutAccount ? <p className="mt-3 break-all font-mono text-[12px] text-chalk/60">{payoutAccount}</p> : null}
          </section>
        )}
        {phase === "paid" && (
          <section className="mt-5">
            <p className="font-sign text-2xl">Paid.</p>
            {payoutAccount ? <p className="mt-3 break-all font-mono text-[12px] text-chalk/60">{payoutAccount}</p> : null}
          </section>
        )}
        {phase === "closed" && <p className="mt-5 text-sm text-chalk/70">This crack can no longer be claimed.</p>}
        {vault && <p className="mt-4 font-mono text-[11px] text-chalk/45">Round {vault.round}</p>}
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
