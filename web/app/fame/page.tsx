import { screen } from "@/lib/screen";
import Link from "next/link";

export const metadata = screen("Names, not ledgers.", "A crack shows the night. The bill that worked stays off this page.", { index: false });

export default function FamePage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Hall of fame</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Names, not ledgers.</h1>
        <p className="mt-2 text-sm text-chalk/65">A crack shows the night. It never shows the bill that worked.</p>
        <p className="mt-6 rounded-2xl border border-white/10 bg-night-2 px-4 py-3 text-sm text-chalk/70">No names are stored.</p>
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}
