"use client";

import { useEffect, useState } from "react";
import { payoutExplorerUrl } from "@/lib/explorer";
import { fromBaseUnits } from "@/lib/token";
import { readPayoutToken, revealAccountKey, sendTransfer } from "@/lib/wallet-move";

/** The payout account. The key can be copied out, and the token can be sent on testnet. */
export function PayoutWallet({
  accountId,
  vaultId,
  round,
  rpcUrl,
  contractId,
  networkId,
}: {
  accountId: string;
  vaultId: string;
  round: string;
  rpcUrl: string;
  contractId: string;
  networkId: string;
}) {
  const [symbol, setSymbol] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [opened, setOpened] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState<"key" | "send" | null>(null);

  useEffect(() => {
    let live = true;
    readPayoutToken(rpcUrl, contractId, accountId).then((result) => {
      if (!live) return;
      if (!result.ok) {
        setBalanceError(result.error);
        return;
      }
      setSymbol(result.symbol);
      setDecimals(result.decimals);
      setTokenId(result.tokenId);
      setBalance(result.balance);
      setOpened(result.opened);
      setBalanceError(null);
    });
    return () => { live = false; };
  }, [rpcUrl, contractId, accountId, hash]);

  const shown = balance !== null && decimals !== null ? fromBaseUnits(balance, decimals) : null;
  const payment = hash ? payoutExplorerUrl(hash) : null;

  async function showKey() {
    setBusy("key");
    setNote(null);
    const revealed = await revealAccountKey({ networkId, vaultId, round });
    setBusy(null);
    if (!revealed.ok) {
      setNote(revealed.error);
      return;
    }
    setSecret(revealed.secret);
  }

  async function send() {
    if (!tokenId || decimals === null || balance === null) return;
    setBusy("send");
    setNote(null);
    setHash(null);
    const sent = await sendTransfer({
      networkId,
      rpcUrl,
      vaultId,
      round,
      from: accountId,
      tokenId,
      to,
      amountText: amount,
      decimals,
      balance,
    });
    setBusy(null);
    if (!sent.ok) {
      setNote(sent.error);
      return;
    }
    setHash(sent.transactionHash);
    setAmount("");
  }

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
      <h2 className="font-sign text-xl">Your wallet</h2>
      {/* The name of an account made for a passkey is a hash and a long suffix. It is not shown. */}
      {GENERATED.test(accountId) ? null : <p className="mt-2 font-mono text-[12px] text-chalk/70 [overflow-wrap:anywhere]">{accountParts(accountId)}</p>}
      <p className="mt-3 text-sm text-chalk/70">
        {balanceError ? balanceError : shown ? `${shown} ${symbol ?? ""}${opened ? "" : ". This wallet is not on testnet yet."}`.trim() : "Reading the balance."}
      </p>
      {/* There is nothing to move until the account holds something, so the section waits for a balance. */}
      {balance !== null && balance > 0n ? (
      <details className="mt-4 group">
        <summary className="chalk-focus inline-flex min-h-11 cursor-pointer items-center text-sm text-chalk/80 underline decoration-white/20">Move your winnings</summary>
        <p className="mt-2 text-sm text-chalk/60">Send the token to another testnet account, or take this account to another wallet. You do not need either to be paid.</p>
      <div className="mt-4">
        <button type="button" disabled={busy !== null} onClick={() => void showKey()} className="chalk-focus min-h-11 rounded-2xl border border-chalk/30 px-4 py-2 text-sm disabled:opacity-40">
          {busy === "key" ? "Waiting for your passkey" : "Export the key"}
        </button>
        <p className="mt-2 text-sm text-chalk/60">Only for using this account in another wallet. Anyone with this key can spend everything in the account. Never paste it into a site or share it.</p>
        {secret ? (
          <div className="mt-3">
            <p className="break-all font-mono text-[12px] text-chalk">{secret}</p>
            <button type="button" onClick={() => void navigator.clipboard.writeText(secret).catch(() => undefined)} className="chalk-focus mt-2 min-h-11 rounded-2xl border border-chalk/30 px-4 py-2 text-sm">
              Copy key
            </button>
            <button type="button" onClick={() => setSecret(null)} className="chalk-focus mt-2 ml-2 min-h-11 text-sm text-chalk/70 underline decoration-white/20">
              Hide key
            </button>
          </div>
        ) : null}
      </div>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="block text-sm text-chalk/80" htmlFor="payout-to">Send to</label>
        <input id="payout-to" value={to} onChange={(event) => setTo(event.target.value)} placeholder="name.testnet" className="w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm" />
        <label className="block text-sm text-chalk/80" htmlFor="payout-amount">Amount</label>
        <input id="payout-amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm" />
        <button type="submit" disabled={busy !== null || !tokenId} className="chalk-focus min-h-11 w-full rounded-2xl bg-chalk py-3 font-sign text-lg text-ink disabled:opacity-40">
          {busy === "send" ? "Sending" : "Send"}
        </button>
      </form>
      </details>
      ) : null}
      {note ? <p role="status" className="mt-3 text-sm text-chalk/70">{note}</p> : null}
      {payment ? (
        <a href={payment} target="_blank" rel="noreferrer" className="chalk-focus mt-3 inline-flex min-h-11 items-center text-sm text-chalk underline decoration-white/20">
          View the transfer
        </a>
      ) : null}
    </section>
  );
}

/** The accounts the relay makes for a passkey: `p`, twelve hex digits, then the relay account. */
const GENERATED = /^p[0-9a-f]{12}\./;

/** A line break is offered before each dot, so `.relay.….testnet` moves down whole before the name itself is split. */
function accountParts(accountId: string) {
  return accountId.split(".").map((part, index) => (
    <span key={index}>
      {index > 0 ? <><wbr />.</> : null}
      {part}
    </span>
  ));
}
