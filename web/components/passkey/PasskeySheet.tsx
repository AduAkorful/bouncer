"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deriveSecrets, unlockDevice } from "@/lib/device-pass";
import { accessMessage, accessOnAccount, testnetAccountId, writePayoutAccount } from "@/lib/imported-account";

type Step = "create" | "signing" | "add" | "done" | "error";

export function PasskeySheet({
  next,
  rpcUrl,
  networkId,
  vaultId,
  storageName,
}: {
  next: "claim" | "profile";
  rpcUrl: string;
  networkId: string;
  vaultId: string;
  storageName: string;
}) {
  const [step, setStep] = useState<Step>("create");
  const [detail, setDetail] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  async function unlock() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const result = await unlockDevice(controller.signal, "create");
    if (request.current !== controller) {
      if ("ikm" in result) result.ikm.fill(0);
      return null;
    }
    request.current = null;
    return result;
  }

  async function create() {
    setStep("signing");
    setDetail(null);
    const unlocked = await unlock();
    if (!unlocked) return;
    if ("error" in unlocked) {
      setStep("error");
      setDetail(unlocked.error);
      return;
    }
    unlocked.ikm.fill(0);
    writePayoutAccount(window.localStorage, storageName, null);
    setAccountId(null);
    setStep("done");
  }

  async function bind() {
    const named = testnetAccountId(accountDraft);
    if (networkId !== "testnet") {
      setStep("error");
      setDetail("The passkey network is not testnet.");
      return;
    }
    if (!named) {
      setNameError("That account name cannot be used.");
      nameField.current?.focus();
      return;
    }
    setNameError(null);
    setStep("signing");
    setDetail(null);
    const unlocked = await unlock();
    if (!unlocked) return;
    if ("error" in unlocked) {
      setStep("error");
      setDetail(unlocked.error);
      return;
    }
    const secrets = await deriveSecrets(unlocked.ikm, vaultId, "0");
    unlocked.ikm.fill(0);
    if ("error" in secrets) {
      setStep("error");
      setDetail("This phone cannot keep a key in the passkey.");
      return;
    }
    setAccountId(named);
    setPublicKey(secrets.accountPublicKey);
    await look(named, secrets.accountPublicKey);
  }

  async function look(named: string, key: string) {
    setBusy(true);
    const check = await accessOnAccount(rpcUrl, named, key);
    setBusy(false);
    if (check === "full") {
      writePayoutAccount(window.localStorage, storageName, named);
      setStep("done");
      return;
    }
    if (check === "missing" || check === "limited") {
      setDetail(accessMessage(check));
      setStep("add");
      return;
    }
    setDetail(accessMessage(check));
    setStep("error");
  }

  return (
    <main className="flex min-h-dvh items-end bg-night px-4 pb-24 pt-10 text-chalk sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-night-2 p-6 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Account</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">{step === "done" ? "Saved." : step === "add" ? "Add this key" : "Save your streak"}</h1>
        {step === "create" && (
          <>
            <p className="mt-3 text-sm text-chalk/70">Use a passkey from your device or password manager. No seed phrase, no password. Clearing this site does not remove it.</p>
            <button onClick={() => void create()} className="mt-6 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_5px_0_#9c9483]">
              Create passkey
            </button>
            <p className="mt-6 text-sm text-chalk/70">Use an account you already have. A passkey will be created for it.</p>
            <label htmlFor="existing-account-id" className="mt-3 block text-sm text-chalk/80">
              Existing account ID
            </label>
            <input
              id="existing-account-id"
              ref={nameField}
              value={accountDraft}
              onChange={(event) => {
                setAccountDraft(event.target.value);
                setNameError(null);
              }}
              placeholder="name.testnet"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "existing-account-error" : undefined}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm"
            />
            {nameError ? <p id="existing-account-error" className="mt-2 text-sm text-chalk/70">{nameError}</p> : null}
            <button onClick={() => void bind()} className="mt-3 w-full rounded-2xl border border-chalk/30 py-3 text-sm">
              Create a passkey for it
            </button>
          </>
        )}
        {step === "signing" && (
          <div className="mt-8 mb-6 text-center">
            <div className="mx-auto size-16 animate-pulse rounded-full border-2 border-uv" />
            <p role="status" className="mt-4 font-sign text-xl">Waiting for your passkey</p>
            <p className="mt-3 text-sm text-chalk/70">Follow your browser’s prompt. Use your device or password manager, or your phone if the browser offers a QR code.</p>
            <button type="button" onClick={() => request.current?.abort()} className="chalk-focus mt-4 min-h-11 rounded-full border border-chalk/30 px-5 text-sm">Cancel</button>
          </div>
        )}
        {step === "add" && accountId && publicKey && (
          <>
            <p className="mt-3 text-sm text-chalk/70">
              A passkey is on this phone for {accountId}. Add this public key in that wallet as a full-access key. The account pays the gas. Then check again.
            </p>
            {detail ? <p className="mt-3 text-sm text-chalk/70">{detail}</p> : null}
            <p className="mt-4 break-all font-mono text-[12px] text-chalk/70">{publicKey}</p>
            <button type="button" onClick={() => void navigator.clipboard.writeText(publicKey).catch(() => undefined)} className="mt-3 rounded-2xl border border-chalk/30 px-4 py-2 text-sm">
              Copy key
            </button>
            <button
              disabled={busy}
              onClick={() => void look(accountId, publicKey)}
              className="mt-3 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40"
            >
              {busy ? "Reading the account" : "Check again"}
            </button>
          </>
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
          <>
            {accountId ? <p className="mt-3 text-sm text-chalk/70">This phone can sign for {accountId}.</p> : null}
            <Link href={next === "claim" ? "/claim" : "/profile"} className="mt-6 block rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink">
              Continue
            </Link>
          </>
        )}
        <Link href="/home" className="mt-6 inline-block text-sm text-chalk/70 underline decoration-white/20">
          Back to the door
        </Link>
      </div>
    </main>
  );
}
