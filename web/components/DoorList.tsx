import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { TryAgain } from "@/components/TryAgain";
import { CloseTime } from "@/components/Countdown";
import { TokenAmount } from "@/components/TokenAmount";
import { cardLook } from "@/lib/card";
import { orderDoors, type ListedDoor } from "@/lib/door-index";
import type { TokenRead } from "@/lib/page-vault";

/** Shown while the chain list is still reading. The door above it does not wait. */
export function DoorListPending({ title = "Other doors" }: { title?: string }) {
  return (
    <section className="mx-auto mt-8 min-w-0 max-w-5xl px-4">
      <h2 className="font-sign text-lg">{title}</h2>
      <p className="mt-3 text-sm text-chalk/70">Reading the doors.</p>
    </section>
  );
}

/** Vaults returned by the chain. An empty or failed read stays empty. */
export function DoorList({
  title,
  doors,
  failed,
  truncated,
  empty,
  retryHref,
  token,
  narrow = false,
}: {
  title: string;
  doors: ListedDoor[];
  failed: boolean;
  truncated: boolean;
  empty: string;
  retryHref: string;
  /** Every vault pays the contract's one token, so one label serves the list. Without it, pots are left off. */
  token?: Promise<TokenRead>;
  /** In a narrow column, such as the closed-queue panel, cards stay two across so signs do not break mid-word. */
  narrow?: boolean;
}) {
  const ordered = orderDoors(doors);
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
        <div className={`mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 ${narrow ? "" : `sm:grid-cols-3 ${WIDE_COLUMNS[ordered.length] ?? ""}`}`}>
          {ordered.map((door, index) => (
            <Link
              key={door.id}
              href={door.href}
              className="chalk-focus min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-night-2">
              {door.read ? (
                <DoorScene
                  sign={door.sign}
                  look={door.card ? cardLook(door.card) : undefined}
                  setting={door.card?.setting}
                  neighbors={false}
                  queue={false}
                  p={`listed-${index}`}
                  viewBox="104 8 192 62"
                  className="block h-16 w-full bg-[#1a1424]"
                  decorative
                />
              ) : (
                <div aria-hidden="true" className="flex h-16 items-center bg-[#1a1424] px-3 font-sign text-sm text-chalk">{door.sign}</div>
              )}
              <div className="p-3">
                <div className="break-words font-sign text-sm leading-tight">{door.sign}</div>
                {door.card?.name ? <div className="mt-0.5 text-xs text-chalk/60">Guard {door.card.name}</div> : null}
                <div className={`mt-1 text-xs ${door.shut ? "text-chalk/60" : "text-brass"}`}>
                  {door.line}
                  {door.round && door.read && door.line !== "Not opened yet" ? <span className="text-chalk/60"> · Round {door.round}</span> : null}
                </div>
                {!door.shut && token && door.dayPot ? <TokenAmount token={token} atomic={door.dayPot} className="mt-1 text-sm text-chalk" /> : null}
                {!door.shut && door.closesAt ? <CloseTime endsAtNs={door.closesAt} prefix="Closes at" className="block text-xs text-chalk/60" /> : null}
                {/* A door that is not taking a queue still fills the lines an open one does, so cards in a row stay level. */}
                {door.shut && door.read && ["Closed", "Not opened yet", "Taken tonight"].includes(door.line) ? (
                  <>
                    <div className="mt-1 text-sm text-chalk/50">
                      {door.line === "Not opened yet" ? "Waiting on its sponsor" : door.line === "Taken tonight" ? "Cut taken" : "No pot tonight"}
                    </div>
                    {door.line === "Not opened yet" ? null : (
                      <div className="text-xs text-chalk/50">{door.line === "Taken tonight" ? "Back with the next round" : "Round over"}</div>
                    )}
                  </>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
      {truncated ? <p className="mt-3 text-sm text-chalk/70">The list stopped after 100 doors.</p> : null}
    </section>
  );
}

/** On a wide screen a short list sits in one row instead of ending on a ragged one. */
const WIDE_COLUMNS: Record<number, string> = { 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" };
