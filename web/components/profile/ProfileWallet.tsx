"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PayoutWallet } from "@/components/claim/PayoutWallet";
import { deriveSecrets } from "@/lib/device-pass";
import { readPayoutAccount } from "@/lib/imported-account";
import { readHold } from "@/lib/player-hold";
import { fromBaseUnits } from "@/lib/token";
import { lookupPasskeyAccount, readPayoutToken } from "@/lib/wallet-move";

type WalletEnv = { rpcUrl: string; contractId: string; networkId: string; storageName: string };

/** The signed-in account. A payout is not required. */
export function useWalletAccount(storageName: string): { status: "reading" | "out" | "ready" | "unread"; accountId: string | null } {
  const [status, setStatus] = useState<"reading" | "out" | "ready" | "unread">("reading");
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const ikm = readHold();
    if (!ikm) {
      setStatus("out");
      return;
    }
    let live = true;
    (async () => {
      const saved = readPayoutAccount(window.localStorage, storageName);
      const secrets = await deriveSecrets(ikm, "account", "0");
      ikm.fill(0);
      if (!live) return;
      if ("error" in secrets) {
        setStatus("unread");
        return;
      }
      const id = saved ?? await lookupPasskeyAccount(secrets.accountPublicKey);
      if (!live) return;
      if (!id) {
        setStatus("unread");
        return;
      }
      setAccountId(id);
      setStatus("ready");
    })();
    return () => { live = false; };
  }, [storageName]);

  return { status, accountId };
}

export function ProfileWallet(env: WalletEnv) {
  const wallet = useWalletAccount(env.storageName);
  if (wallet.status === "out") return null;
  if (wallet.status !== "ready" || !wallet.accountId) {
    return <p className="mt-4 text-sm text-chalk/70">{wallet.status === "unread" ? "The account could not be read." : "Reading the balance."}</p>;
  }
  return (
    <PayoutWallet
      accountId={wallet.accountId}
      vaultId="account"
      round="0"
      rpcUrl={env.rpcUrl}
      contractId={env.contractId}
      networkId={env.networkId}
    />
  );
}

/** A balance on the door. It stays at zero until a payout arrives. */
export function WalletChip(env: WalletEnv) {
  const wallet = useWalletAccount(env.storageName);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.status !== "ready" || !wallet.accountId) return;
    let live = true;
    readPayoutToken(env.rpcUrl, env.contractId, wallet.accountId).then((result) => {
      if (!live || !result.ok) return;
      setText(`${fromBaseUnits(result.balance, result.decimals)} ${result.symbol}`);
    });
    return () => { live = false; };
  }, [wallet.status, wallet.accountId, env.rpcUrl, env.contractId]);

  if (wallet.status !== "ready") return null;
  return (
    <p className="mt-3 text-center text-sm">
      <Link href="/profile" className="chalk-focus inline-flex min-h-11 items-center text-chalk/80 underline decoration-white/20">
        Your wallet · {text ?? "Reading the balance."}
      </Link>
    </p>
  );
}
