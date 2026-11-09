import { DoorScene } from "@/components/DoorScene";
import Link from "next/link";

/** Painted before the vault view returns. No pot and no join. */
export function NightShell({ door = false, href = "/home" }: { door?: boolean; href?: string }) {
  return (
    <main className="min-h-dvh bg-night text-chalk">
      <header className="px-4 py-3">
        <Link href={door ? "/" : href} className="chalk-focus inline-flex min-h-11 items-center font-sign text-lg">
          BOUNCER
        </Link>
      </header>
      {door ? (
        <section className="relative h-[46dvh] min-h-[280px] bg-[#1a1424]">
          <DoorScene sign="" neighbors={false} p="wait" className="size-full" label="Checking the door" />
        </section>
      ) : null}
      <div className="mx-auto max-w-lg px-4 py-8">
        <p role="status" className="font-mono text-sm text-chalk/80">Checking the door…</p>
        {/* The door streams in after this shell, and swapping it in needs JavaScript. */}
        <noscript>
          <p className="mt-2 text-sm text-chalk/80">This page needs JavaScript to show the door. Turn it on and reload.</p>
        </noscript>
        <div aria-hidden="true" className="mt-5 space-y-3">
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="h-3 w-3/4 rounded-full bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/10" />
        </div>
        {!door ? (
          <Link href={href} className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Back to the door
          </Link>
        ) : null}
      </div>
    </main>
  );
}
