"use client";

import { generatedAccount } from "@/lib/account-name";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWalletAccount } from "@/components/profile/ProfileWallet";
import { readSoundPref, writeSoundPref } from "@/lib/sound-pref";
import { resetTips } from "@/lib/tips";

/** What this browser holds: the sign-in and its account, and the street sound choice. */
export function SettingsDevice({ storageName }: { storageName: string }) {
  const wallet = useWalletAccount(storageName);
  const [sound, setSound] = useState(true);
  const [tipsReset, setTipsReset] = useState(false);

  useEffect(() => {
    setSound(readSoundPref() !== "off");
  }, []);

  function toggle() {
    const next = !sound;
    setSound(next);
    writeSoundPref(next);
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-3xl border border-white/10 bg-night-2 p-5">
        <h2 className="font-sign text-lg">Sign-in</h2>
        {wallet.status === "out" ? (
          <p className="mt-2 text-sm text-chalk/70">This browser is not signed in. Your passkey signs you in from the profile, the queue, or a claim.</p>
        ) : wallet.status === "reading" ? (
          <p className="mt-2 text-sm text-chalk/70">Reading this browser.</p>
        ) : wallet.accountId && generatedAccount(wallet.accountId) ? (
          <p className="mt-2 text-sm text-chalk/70">Signed in on this browser. Your wallet was made for this passkey.</p>
        ) : wallet.accountId ? (
          <>
            <p className="mt-2 text-sm text-chalk/70">Signed in on this browser as</p>
            <p className="mt-1 break-all font-mono text-[12px]">{wallet.accountId}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-chalk/70">Signed in on this browser. No testnet account uses this passkey yet; one is made when you claim.</p>
        )}
        {wallet.status !== "out" ? (
          <Link href="/profile" className="chalk-focus mt-2 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Log out from the profile
          </Link>
        ) : null}
      </section>
      <section className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-night-2 p-5">
        <div>
          <h2 className="font-sign text-lg">Street sound</h2>
          <p className="mt-1 text-sm text-chalk/70">{sound ? "Plays from your first tap on the street." : "Off until you turn it on."}</p>
        </div>
        <button type="button" onClick={toggle} aria-pressed={sound} aria-label={sound ? "Street sound on" : "Street sound off"} className="chalk-focus min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm">
          {sound ? "Sound on" : "Sound off"}
        </button>
      </section>
      <section className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-night-2 p-5">
        <div>
          <h2 className="font-sign text-lg">Tips</h2>
          <p className="mt-1 text-sm text-chalk/70" role="status">{tipsReset ? "The tips show again in your next raid." : "Short tips the first time you raid."}</p>
        </div>
        <button type="button" onClick={() => { resetTips(); setTipsReset(true); }} className="chalk-focus min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm">
          Show tips again
        </button>
      </section>
    </div>
  );
}
