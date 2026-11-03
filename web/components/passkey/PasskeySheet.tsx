"use client";

import Link from "next/link";
import { useState } from "react";

export function PasskeySheet({
  networkId,
  authClientId,
  next,
}: {
  networkId: string;
  rpcUrl: string;
  authContractId: string;
  mpcContractId: string;
  authClientId: string;
  next: "claim" | "profile";
}) {
  const [step, setStep] = useState<"create" | "signing" | "done" | "error">("create");
  const [detail, setDetail] = useState<string | null>(null);

  async function create() {
    if (networkId !== "testnet" && networkId !== "mainnet") {
      setStep("error");
      setDetail("The passkey network is not one this provider can use.");
      return;
    }
    setStep("signing");
    setDetail(null);
    try {
      const { JavascriptProvider } = await import("@fast-auth-near/javascript-provider");
      const provider = new JavascriptProvider({ network: networkId, clientId: authClientId });
      await provider.login();
      const loggedIn = await provider.isLoggedIn();
      if (!loggedIn) {
        setStep("error");
        setDetail("The passkey provider did not sign in.");
        return;
      }
      setStep("done");
    } catch (error) {
      setStep("error");
      setDetail(error instanceof Error ? error.message : "passkey");
    }
  }

  return (
    <main className="flex min-h-dvh items-end bg-night px-4 pb-24 pt-10 text-chalk sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-night-2 p-6 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Account</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">{step === "done" ? "Saved." : "Save your streak"}</h1>
        {step === "create" && (
          <>
            <p className="mt-3 text-sm text-chalk/70">One passkey on this phone. No seed phrase, no password.</p>
            <button onClick={() => void create()} className="mt-6 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_5px_0_#9c9483]">
              Create passkey
            </button>
          </>
        )}
        {step === "signing" && (
          <div className="mt-8 mb-6 text-center">
            <div className="mx-auto size-16 animate-pulse rounded-full border-2 border-uv" />
            <p className="mt-4 font-sign text-xl">Signing in</p>
          </div>
        )}
        {step === "error" && (
          <>
            <p className="mt-4 text-sm text-chalk/70">{detail}</p>
            <button onClick={() => setStep("create")} className="mt-6 w-full rounded-2xl border border-chalk/30 py-3 text-sm">
              Try again
            </button>
          </>
        )}
        {step === "done" && (
          <Link href={next === "claim" ? "/claim" : "/profile"} className="mt-6 block rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink">
            Continue
          </Link>
        )}
      </div>
    </main>
  );
}
