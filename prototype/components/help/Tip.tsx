"use client";

/** A one-time first-raid tip (plan 80, §2.2). It sits in the layout, so it never covers an input; it is not a modal. */
export function Tip({ text, onDone, className = "" }: { text: string; onDone: (all: boolean) => void; className?: string }) {
  return (
    <div role="status" className={`w-fit max-w-sm rounded-2xl bg-chalk px-3 py-2 text-ink shadow-lg ${className}`}>
      <p className="text-[13px] leading-snug">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55">Tip</span>
        {text}
      </p>
      <div className="mt-1 flex items-center justify-end gap-3 text-[13px]">
        <button type="button" onClick={() => onDone(true)} className="min-h-11 px-1 text-ink/60 underline decoration-ink/25">
          Skip tips
        </button>
        <button type="button" onClick={() => onDone(false)} className="min-h-11 rounded-full bg-ink px-4 font-semibold text-chalk">
          Got it
        </button>
      </div>
    </div>
  );
}
