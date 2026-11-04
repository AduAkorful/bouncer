import { screen } from "@/lib/screen";
import Link from "next/link";

export const metadata = screen("Real vaults.", "Sponsored vaults. Players still have to get past the bouncer.");

export default function VipPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">VIP</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Real vaults.</h1>
        <p className="mt-2 text-sm text-chalk/65">A sponsor funds the pot. Players still have to get past the bouncer. The unpaid list stays off this page.</p>
        <p className="mt-6 rounded-3xl border border-white/10 bg-night-2 p-5 text-sm text-chalk/70">No sponsored vault is listed.</p>
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}
