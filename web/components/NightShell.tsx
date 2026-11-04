import { DoorScene } from "@/components/DoorScene";
import Link from "next/link";

/** Painted before the vault view returns. No pot and no join. */
export function NightShell({ door = false }: { door?: boolean }) {
  return (
    <main className="min-h-dvh bg-night text-chalk">
      <header className="px-4 py-3">
        <span className="font-sign text-lg">BOUNCER</span>
      </header>
      {door ? (
        <section className="relative h-[46dvh] min-h-[280px] bg-[#1a1424]">
          <DoorScene sign="THE VELVET" neighbors={false} p="wait" className="size-full" />
        </section>
      ) : null}
      <div className="mx-auto max-w-lg px-4 py-8">
        <p role="status" className="font-mono text-sm text-chalk/80">Checking the door…</p>
        <div aria-hidden="true" className="mt-5 space-y-3">
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="h-3 w-3/4 rounded-full bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/10" />
        </div>
        {!door ? (
          <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Back to the door
          </Link>
        ) : null}
      </div>
    </main>
  );
}
