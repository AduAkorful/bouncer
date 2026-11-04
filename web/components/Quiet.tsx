import Link from "next/link";

export function Quiet({ kicker, title, detail }: { kicker: string; title: string; detail: string }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">{kicker}</p>
        <h1 className="mt-2 font-sign text-3xl leading-tight">{title}</h1>
        <p className="mt-3 text-sm text-chalk/70">{detail}</p>
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          Back to the door
        </Link>
      </div>
    </main>
  );
}
