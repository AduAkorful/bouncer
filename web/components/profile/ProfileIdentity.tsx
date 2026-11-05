"use client";

import { useEffect, useState } from "react";
import { testnetAccountId } from "@/lib/imported-account";

export function ProfileIdentity({ storageName }: { storageName: string }) {
  const [state, setState] = useState<{ account: string | null; error: boolean } | null>(null);

  useEffect(() => {
    try {
      if (!storageName.trim()) throw new Error("storage unavailable");
      const raw = window.localStorage.getItem(`${storageName.trim()}.payout-account`);
      setState({ account: raw ? testnetAccountId(raw) : null, error: false });
    } catch {
      setState({ account: null, error: true });
    }
  }, [storageName]);

  return (
    <>
      <h1 className="mt-1 font-sign text-3xl leading-none">Your profile</h1>
      {state === null ? <p className="mt-2 text-sm text-chalk/60">Reading this browser.</p> : state.error ? (
        <p role="status" className="mt-2 text-sm text-chalk/70">The account name could not be read on this browser.</p>
      ) : state.account ? (
        <p className="mt-2 break-all text-sm text-chalk/70">Account name saved on this browser: {state.account}. Its access has not been checked here.</p>
      ) : (
        <p className="mt-2 text-sm text-chalk/70">Use your passkey when you need your account. A testnet account can be created when needed.</p>
      )}
    </>
  );
}
