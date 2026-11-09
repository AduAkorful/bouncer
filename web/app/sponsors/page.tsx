import { screen } from "@/lib/screen";
import Link from "next/link";

export const metadata = screen(
  "Sponsor a door",
  "Fund a pot, write who the place owes, and let the guard run the door. Players try to get a bill past it.",
);

const steps = [
  {
    title: "Bring the pot.",
    text: "A passkey on this device is the sponsor account. It pays for storage and holds the tokens you put in. You need the door's token for the pot and a little NEAR for storage. This site does not send you either.",
  },
  {
    title: "Write who is owed.",
    text: "Describe the place and the bills it owes. You can draft that story or write it yourself. A fairness check has to pass before the story is sealed. The guard pays an honest bill. A wrong bill says only Not approved.",
  },
  {
    title: "Open the night.",
    text: "Name the door and the guard, and pick the street. Set a cap and a lock, create the vault, fund it, and open the queue. Players try to get a bill past the guard. The contract pays. The model never holds a key.",
  },
] as const;

export default function SponsorsPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Sponsors</p>
        <h1 className="mt-2 font-sign text-4xl leading-none sm:text-5xl">Sponsor a door.</h1>
        <p className="mt-4 text-lg leading-snug text-chalk/85">
          A sponsor funds a night. Players try to talk a bill past the guard. You decide the place. The vault pays the honest ones.
        </p>
        <ol className="mt-8 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3">
              <span className="font-sign text-lg leading-none text-rope">{index + 1}</span>
              <span>
                <span className="block font-sign text-2xl leading-none">{step.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-chalk/75">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link
          href="/sponsor"
          className="chalk-focus mt-8 block w-full rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
        >
          Sponsor a door
        </Link>
        <p className="mt-4 text-sm text-chalk/60">Testnet only. The tokens have no cash value. New doors open only when the registry says they are open. The sponsor page says so before you start.</p>
        <div className="mt-8 flex flex-wrap gap-x-5">
          <Link href="/" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Bouncer
          </Link>
          <Link href="/home" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            The door
          </Link>
          <Link href="/creator" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            Try the look builder
          </Link>
        </div>
      </div>
    </main>
  );
}
