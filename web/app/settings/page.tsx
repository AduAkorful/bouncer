import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Settings</p>
        <h1 className="mt-1 font-sign text-3xl">This device</h1>
        <p className="mt-2 text-sm text-chalk/65">No account is stored here yet.</p>
        <div className="mt-8 space-y-2">
          <Link href="/profile" className="block rounded-2xl border border-white/10 px-4 py-3">
            Profile
          </Link>
          <Link href="/passkey" className="block rounded-2xl border border-white/10 px-4 py-3">
            Passkey
          </Link>
          <Link href="/" className="block rounded-2xl border border-white/10 px-4 py-3">
            The door
          </Link>
        </div>
      </div>
    </main>
  );
}
