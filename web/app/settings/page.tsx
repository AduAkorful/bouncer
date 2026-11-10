import { SiteNav } from "@/components/SiteNav";
import { screen } from "@/lib/screen";
import Link from "next/link";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { SettingsDevice } from "@/components/settings/SettingsDevice";

export const metadata = screen("This device", "Settings for this device.");

export default function SettingsPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Settings</p>
        <ProfileIdentity storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} heading="This device" />
        <SettingsDevice storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} />
        <div className="mt-8 space-y-2">
          <Link href="/profile" className="chalk-focus flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3">
            Profile
          </Link>
          <Link href="/passkey" className="chalk-focus flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3">
            Passkey
          </Link>
          <Link href="/home" className="chalk-focus flex min-h-11 items-center rounded-2xl border border-white/10 px-4 py-3">
            The door
          </Link>
        </div>
      </div>
    </main>
  );
}
