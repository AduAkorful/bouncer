import { STORY } from "@/lib/demo/frames";

/** An index of screens that already exist. The paid row keeps the hash slot empty until a real win. */
export function Storyboard() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Storyboard</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">The night, in order.</h1>
        <p className="mt-3 text-sm text-chalk/70">Each shot opens a frame that is already in the prototype. Nothing on this page is a new screen.</p>
        <ol className="mt-6 space-y-3">
          {STORY.map((shot, index) => (
            <li key={shot.href} className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3">
              <a href={shot.href} className="chalk-focus block">
                <span className="font-mono text-xs text-chalk/60">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-1 block font-sign text-xl leading-tight">{shot.title}</span>
                <span className="mt-1 block text-sm text-chalk/70">{shot.note}</span>
              </a>
              {shot.hash ? <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-brass">TX HASH PENDING</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
