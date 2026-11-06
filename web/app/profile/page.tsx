import { screen } from "@/lib/screen";
import Link from "next/link";
import { ProfileHistory } from "@/components/profile/ProfileHistory";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";

export const metadata = screen("Profile", "The account stored on this device.");

export default function ProfilePage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Profile</p>
        <ProfileIdentity storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} />
        <Link href="/passkey" className="chalk-focus mt-5 flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3 text-sm">
          Passkey
        </Link>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat k="Streak" v="—" />
          <Stat k="Rank" v="—" />
          <Stat k="Tickets" v="—" />
        </div>

        <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">History</h2>
          <ProfileHistory storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} defaultVaultId={process.env.NEXT_PUBLIC_VAULT_ID ?? ""} />
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">Case notes</h2>
          <p className="mt-2 text-sm text-chalk/70">Case notes stay with the raid. This page does not list them.</p>
        </section>
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-2 px-3 py-3">
      <div className="font-mono text-xs uppercase tracking-wider text-chalk/80">{k}</div>
      <div className="mt-1 font-sign text-xl">{v}</div>
    </div>
  );
}
