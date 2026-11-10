"use client";

import { SiteNav } from "@/components/SiteNav";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";
import { Countdown } from "@/components/Countdown";
import { TryAgain } from "@/components/TryAgain";
import { NetworkTag } from "@/components/bits";
import { TokenAmount, TokenWord } from "@/components/TokenAmount";
import { deriveSecrets } from "@/lib/device-pass";
import { readHold, unlockHeld } from "@/lib/player-hold";
import { readPayoutAccount, testnetAccountId, writePayoutAccount } from "@/lib/imported-account";
import { addWalletKey, sendClaim } from "@/lib/send-claim";
import { PayoutWallet } from "@/components/claim/PayoutWallet";
import { PaidMoment } from "@/components/claim/PaidMoment";
import { VerifiedPanel } from "@/components/claim/VerifiedPanel";
import { playableRaid } from "@/lib/door";
import { heldRefusal, heldVerdict, submitHeld, UNSENDABLE, unsendableVerdict } from "@/lib/held-verdict";
import { payoutExplorerUrl } from "@/lib/explorer";
import { loadRaid, saveRaid, type StoredRaid } from "@/lib/session-store";
import type { TokenRead } from "@/lib/page-vault";
import type { CrackView, VaultView } from "@/lib/vault";

type Phase = "locked" | "ready" | "paying" | "paid" | "closed";

const HELD = "Your bill was approved, but the vault has not recorded it yet. It cannot be claimed until it is.";

export function ClaimDoor({
  vaultId,
  token,
  storageName,
  networkTag,
  round,
  rpcUrl,
  contractId,
  networkId,
  doorHref,
  retryHref,
  sign,
  guard = null,
}: {
  /** The door's sign and guard, for the paid moment and its share. */
  sign: string;
  guard?: string | null;
  vaultId: string;
  token: Promise<TokenRead>;
  storageName: string;
  networkTag: string;
  round: string;
  rpcUrl: string;
  contractId: string;
  networkId: string;
  doorHref: string;
  retryHref: string;
}) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [crack, setCrack] = useState<CrackView | null>(null);
  const [vault, setVault] = useState<VaultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<string | null>(null);
  const [raidId, setRaidId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [retry, setRetry] = useState(false);
  const [walletKey, setWalletKey] = useState("");
  const [keyNote, setKeyNote] = useState<string | null>(null);
  const [namedAccount, setNamedAccount] = useState("");
  const [preference, setPreference] = useState<"unset" | "new" | "existing">("unset");
  const [payoutHash, setPayoutHash] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const raidRecord = useRef<StoredRaid | null>(null);
  const [evidence, setEvidence] = useState<{ bundle: StoredRaid["proof"]; verdict: Record<string, unknown>; signature: string } | null>(null);
  // The vault's clock minus this browser's, so the lock opens on screen when it opens on chain.
  const skew = useRef(0);
  const payoutUrl = payoutHash ? payoutExplorerUrl(payoutHash) : null;

  useEffect(() => {
    const stored = readPayoutAccount(window.localStorage, storageName);
    if (stored) {
      setNamedAccount(stored);
      setPreference("existing");
      setPayoutAccount(stored);
    }
  }, [storageName]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const raid = playableRaid(await loadRaid(storageName, vaultId, round));
      if (!raid) {
        if (!cancel) {
          setMissing(true);
          setRetry(false);
          setError("No raid is stored on this device.");
          // Signed in on this browser already: rebuild the raid from that sign-in instead of asking again.
          void readHold().then((held) => { if (held) { held.fill(0); void recover(); } });
        }
        return;
      }
      if (!("playerId" in raid)) {
        if (!cancel) {
          setMissing(false);
          setRetry(true);
          setError("The door did not answer.");
        }
        return;
      }
      if (!cancel) {
        setRaidId(raid.raidId);
        raidRecord.current = raid;
        if (raid.payoutHash) setPayoutHash(raid.payoutHash);
        const signedVerdict = raid.verdict && typeof raid.verdict === "object" && !Array.isArray(raid.verdict) ? (raid.verdict as Record<string, unknown>) : null;
        setEvidence(signedVerdict && typeof raid.signature === "string" ? { bundle: raid.proof ?? null, verdict: signedVerdict, signature: raid.signature } : null);
      }
      const sent = await apiPost("/crack", { raid_id: raid.raidId, vault_id: vaultId, round });
      const body = (sent.ok ? sent.body : null) as {
        ok?: boolean;
        error?: string;
        crack?: CrackView | null;
        nowMs?: number;
        vault?: VaultView;
      } | null;
      if (!body?.ok || !body.vault || typeof body.nowMs !== "number") {
        if (!cancel) {
          setRetry(true);
          setError("The vault did not answer.");
        }
        return;
      }
      if (!body.crack) {
        if (!cancel) {
          const holding = Boolean(heldVerdict(raid));
          const refusal = heldRefusal(raid);
          setHeld(holding && !refusal);
          setError(refusal ? `${HELD} ${refusal}` : holding ? HELD : unsendableVerdict(raid) ? UNSENDABLE : "No crack is recorded for this raid.");
        }
        return;
      }
      if (!cancel) {
        setCrack(body.crack);
        setVault(body.vault);
        skew.current = body.nowMs - Date.now();
        setPhase(phaseOf(body.crack, body.nowMs));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [storageName, vaultId, round]);

  // A lock that opens while the page is up turns into the Claim button without a reload.
  useEffect(() => {
    if (phase !== "locked" || !crack) return;
    const unlockMs = Number(BigInt(crack.unlockAt) / 1_000_000n);
    if (!Number.isSafeInteger(unlockMs)) return;
    const wait = Math.max(0, unlockMs - (Date.now() + skew.current)) + 1_000;
    const timer = setTimeout(() => setPhase(phaseOf(crack, Date.now() + skew.current)), Math.min(wait, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [phase, crack]);

  useEffect(() => {
    if (phase !== "paying") return;
    let cancel = false;
    const look = async () => {
      if (cancel || !raidId) return;
      const sent = await apiPost("/crack", { raid_id: raidId, vault_id: vaultId, round });
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
    const sent = await apiPost("/crack", { raid_id: id, vault_id: vaultId, round });
    const body = (sent.ok ? sent.body : null) as {
      ok?: boolean;
      crack?: CrackView | null;
      nowMs?: number;
      vault?: VaultView;
    } | null;
    if (!body?.ok || !body.vault || typeof body.nowMs !== "number") {
      setRetry(true);
      setError("The vault did not answer.");
      return;
    }
    if (!body.crack) {
      setRetry(false);
      const holding = Boolean(heldVerdict(raidRecord.current));
      const refusal = heldRefusal(raidRecord.current);
      setHeld(holding && !refusal);
      setError(refusal ? `${HELD} ${refusal}` : holding ? HELD : unsendableVerdict(raidRecord.current) ? UNSENDABLE : "No crack is recorded for this raid.");
      return;
    }
    setHeld(false);
    setRetry(false);
    setMissing(false);
    setCrack(body.crack);
    setVault(body.vault);
    skew.current = body.nowMs - Date.now();
        setPhase(phaseOf(body.crack, body.nowMs));
    setError(null);
  }

  async function recover() {
    setBusy(true);
    setRetry(false);
    setError(null);
    const unlocked = await unlockHeld();
    if ("error" in unlocked) {
      setBusy(false);
      setError(unlocked.error);
      return;
    }
    const secrets = await deriveSecrets(unlocked.ikm, vaultId, round);
    unlocked.ikm.fill(0);
    setBusy(false);
    if ("error" in secrets) {
      setError("This device cannot keep a key in the passkey.");
      return;
    }
    setRaidId(secrets.raidId);
    await readCrack(secrets.raidId);
  }

  async function sendHeld() {
    const record = raidRecord.current;
    const verdict = heldVerdict(record);
    if (!record || !verdict) return;
    setBusy(true);
    setError(null);
    const outcome = await submitHeld(verdict, record.raidId, vaultId, apiPost);
    if (!outcome.ok) {
      if (outcome.refused) {
        const refusedRecord = { ...record, refused: outcome.message };
        raidRecord.current = refusedRecord;
        await saveRaid(storageName, vaultId, round, refusedRecord).catch(() => undefined);
      }
      setBusy(false);
      setHeld(outcome.retry);
      setError(`${outcome.message} The signed verdict stays on this device.`);
      return;
    }
    const next = { ...record, transactionHash: outcome.transactionHash, recorded: true, refused: null };
    raidRecord.current = next;
    await saveRaid(storageName, vaultId, round, next).catch(() => undefined);
    await readCrack(record.raidId);
    setBusy(false);
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
    if (chosen && vault && chosen === vault.sponsor) {
      setError("A door's sponsor cannot be paid from it. Choose another account.");
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
      refuse: vault ? [vault.sponsor] : [],
    });
    setBusy(false);
    if (!sent.ok) {
      setError(sent.error);
      return;
    }
    writePayoutAccount(window.localStorage, storageName, sent.accountId);
    setPayoutAccount(sent.accountId);
    setPayoutHash(sent.transactionHash);
    const record = raidRecord.current;
    if (record && payoutExplorerUrl(sent.transactionHash)) {
      const next = { ...record, payoutHash: sent.transactionHash };
      raidRecord.current = next;
      try {
        await saveRaid(storageName, vaultId, round, next);
      } catch {
        // The hash stays on this screen even if this browser cannot store it.
      }
    }
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

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Payout</p>
          <NetworkTag label={networkTag} className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Your cut</h1>
        {crack ? <div className="mt-3"><TokenAmount token={token} atomic={crack.amount} className="text-4xl text-brass" /></div> : null}
        {error ? <p className="mt-4 text-sm text-chalk/70">{error}</p> : phase === null && !missing ? <p className="mt-4 text-sm text-chalk/70">Reading this claim.</p> : null}
        {retry ? (
          <div className="mt-4">
            <TryAgain href={retryHref} />
          </div>
        ) : null}
        {held && (
          <button disabled={busy} onClick={() => void sendHeld()} className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
            {busy ? "Sending the verdict…" : "Send the verdict again"}
          </button>
        )}
        {missing && (
          <button disabled={busy} onClick={() => void recover()} className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
            {busy ? "Waiting for your passkey" : "Use your device passkey"}
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
            {preference === "existing" && namedAccount.trim() ? (
              <p className="text-sm text-chalk/70">The lock is open. This device&apos;s passkey signs the claim, and the vault pays {namedAccount.trim()}.</p>
            ) : (
              <TokenWord token={token}>
                {(symbol) => (
                  <p className="text-sm text-chalk/70">
                    The lock is open. Claim uses a passkey on this device. That account is the payout, and the vault sends the {symbol} there.
                  </p>
                )}
              </TokenWord>
            )}
            {preference === "existing" && (
              <>
                <input
                  value={namedAccount}
                  onChange={(event) => setNamedAccount(event.target.value)}
                  placeholder="name.testnet"
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm"
                />
                <p className="mt-2 text-sm text-chalk/60">This device's passkey has to be a full-access key on that account. The account pays the gas.</p>
              </>
            )}
            <button disabled={busy} onClick={() => void claim()} className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">
              {busy ? "Waiting for the passkey" : "Claim"}
            </button>
            {preference === "existing" ? (
              <button type="button" onClick={() => setPreference("new")} className="mt-3 w-full text-sm text-chalk/70 underline decoration-white/20">
                Use this passkey&apos;s own account
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
            {payoutUrl ? <PaymentLink href={payoutUrl} /> : null}
          </section>
        )}
        {phase === "paid" && crack ? (
          <>
            <PaidMoment token={token} atomic={crack.amount} sign={sign} guard={guard} vaultId={vaultId} storageName={storageName} doorHref={doorHref} revealHref={doorHref.replace(/\/?$/, "") === "/home" ? "/reveal" : `${doorHref}/reveal`} />
            {payoutUrl ? <PaymentLink href={payoutUrl} /> : null}
          </>
        ) : null}
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
                <p className="mt-4 text-sm text-chalk/70">The key stays on this device. Paste a wallet public key to use this account there.</p>
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
        {payoutAccount && phase === "paid" ? (
          <PayoutWallet
            accountId={payoutAccount}
            vaultId={vaultId}
            round={round}
            rpcUrl={rpcUrl}
            contractId={contractId}
            networkId={networkId}
          />
        ) : null}
        {evidence && vault ? <VerifiedPanel bundle={evidence.bundle ?? null} verdict={evidence.verdict} signature={evidence.signature} guardKey={vault.guardPk} /> : null}
        {vault && <p className="mt-4 font-mono text-xs text-chalk/80">Round {vault.round}</p>}
        <Link href={doorHref} className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}

function PaymentLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chalk-focus mt-4 inline-flex min-h-11 items-center text-sm text-chalk underline decoration-white/20">
      View the payment
    </a>
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
