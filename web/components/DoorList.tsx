import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { TryAgain } from "@/components/TryAgain";
import { cardLook } from "@/lib/card";
import type { ListedDoor } from "@/lib/door-index";

/** Vaults returned by the chain. An empty or failed read stays empty. */
export function DoorList({
  title,
  doors,
  failed,
  truncated,
  empty,
  retryHref,
}: {
  title: string;
  doors: ListedDoor[];
  failed: boolean;
  truncated: boolean;
  empty: string;
  retryHref: string;
}) {
  return (
    <section className="mx-auto mt-8 min-w-0 max-w-5xl px-4">
      <h2 className="font-sign text-lg">{title}</h2>
      {failed ? (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <p className="text-sm text-chalk/70">Other doors could not be read.</p>
          <TryAgain href={retryHref} />
        </div>
      ) : doors.length === 0 ? (
        <p className="mt-3 text-sm text-chalk/70">{empty}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3">
          {doors.map((door, index) => (
            <Link key={door.id} href={door.href} className="chalk-focus min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-night-2">
              {door.card ? (
                <DoorScene
                  sign={door.sign}
                  look={cardLook(door.card)}
                  neighbors={false}
                  queue={false}
                  p={`listed-${index}`}
                  viewBox="104 8 192 62"
                  className="block h-16 w-full bg-[#1a1424]"
                  decorative
                />
              ) : (
                <div className="flex h-16 items-center bg-[#1a1424] px-3 font-sign text-sm text-chalk">{door.sign}</div>
              )}
              <div className="p-3">
                <div className="font-sign text-sm leading-tight">{door.name}</div>
                <div className="mt-0.5 text-xs text-chalk/60">{door.line}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {truncated ? <p className="mt-3 text-sm text-chalk/70">The list stopped after 100 doors.</p> : null}
    </section>
  );
}
