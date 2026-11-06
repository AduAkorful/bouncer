import Link from "next/link";
import { TryAgain } from "@/components/TryAgain";
import type { UnreadDoor } from "@/lib/door-read";

/** A door page that did not receive a vault view. No scene, pot, or default venue. */
export function DoorUnread({ label, title, detail, retryHref, backHref }: UnreadDoor & { retryHref: string | null; backHref: string | null }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-night-2 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Unavailable</p>
        {label ? <p className="mt-3 break-all font-mono text-sm text-chalk">{label}</p> : null}
        <h1 className="mt-2 font-sign text-3xl leading-none">{title}</h1>
        <p className="mt-3 text-sm text-chalk/70">{detail}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {retryHref ? <TryAgain href={retryHref} /> : null}
          {backHref ? (
            <Link href={backHref} className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
              Back to the door
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
