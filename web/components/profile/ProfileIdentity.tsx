"use client";

import { generatedAccount } from "@/lib/account-name";
import { useEffect, useState } from "react";
import { testnetAccountId } from "@/lib/imported-account";
import { readHold } from "@/lib/player-hold";

export function ProfileIdentity({ storageName, heading = "Your profile" }: { storageName: string; heading?: string }) {
  const [state, setState] = useState<{ account: string | null; error: boolean; signedIn: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        if (!storageName.trim()) throw new Error("storage unavailable");
        const raw = window.localStorage.getItem(`${storageName.trim()}.payout-account`);
        const held = await readHold();
        held?.fill(0);
        if (live) setState({ account: raw ? testnetAccountId(raw) : null, error: false, signedIn: Boolean(held) });
      } catch {
        if (live) setState({ account: null, error: true, signedIn: false });
      }
    })();
    return () => { live = false; };
  }, [storageName]);

  return (
    <>
      <h1 className="mt-1 font-sign text-3xl leading-none">{heading}</h1>
      {state === null ? <p className="mt-2 text-sm text-chalk/60">Reading this browser.</p> : state.error ? (
        <p role="status" className="mt-2 text-sm text-chalk/70">The account name could not be read on this browser.</p>
      ) : state.account && generatedAccount(state.account) ? (
        <p className="mt-2 text-sm text-chalk/70">Signed in with your passkey on this browser. Your wallet was made for this passkey.</p>
      ) : state.account ? (
        <div className="mt-2 text-sm text-chalk/70">
          <p>Account name saved on this browser. Its access has not been checked here.</p>
          {/* A passkey account name is one long word, so only it may break anywhere. */}
          <p className="mt-1 break-all font-mono text-[12px]">{state.account}</p>
        </div>
      ) : state.signedIn ? (
        <p className="mt-2 text-sm text-chalk/70">Signed in with your passkey on this browser.</p>
      ) : (
        <p className="mt-2 text-sm text-chalk/70">Use your passkey when you need your account. A testnet account can be created when needed.</p>
      )}
    </>
  );
}
