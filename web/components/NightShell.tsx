import { DoorScene } from "@/components/DoorScene";

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
    </main>
  );
}
