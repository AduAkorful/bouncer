import { SiteNav } from "@/components/SiteNav";
import { screen } from "@/lib/screen";
import Link from "next/link";
import { ProfileHistory } from "@/components/profile/ProfileHistory";
import { PlayerName } from "@/components/profile/PlayerName";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileWallet } from "@/components/profile/ProfileWallet";
import { readPublicEnv } from "@/lib/config";

export const metadata = screen("Profile", "The account stored on this device.");

export default function ProfilePage() {
  const labels = readPublicEnv(process.env);
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Profile</p>
        <ProfileIdentity storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} />
        <PlayerName storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} />
        {labels.ok ? (
          <ProfileWallet
            rpcUrl={labels.env.rpcUrl}
            contractId={labels.env.contractId}
            networkId={labels.env.networkId}
            storageName={labels.env.storageName}
          />
        ) : null}

        <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">History</h2>
          <ProfileHistory storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} />
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">Case notes</h2>
          <p className="mt-2 text-sm text-chalk/70">Case notes stay with the raid. This page does not list them.</p>
        </section>
        <div className="mt-6 flex flex-wrap gap-x-5">
          <Link href="/sponsors" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Sponsor a door
          </Link>
          <Link href="/fame" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Hall of fame
          </Link>
          <Link href="/home" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            The door
          </Link>
        </div>
      </div>
    </main>
  );
}
