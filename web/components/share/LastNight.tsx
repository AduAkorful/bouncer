"use client";

import { useEffect, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { readLastShare, type LastShare } from "@/lib/last-share";
import { shareText, squares } from "@/lib/share-text";

/** The last raid this browser finished, as a card that can be shared again. */
export function LastNight({ storageName }: { storageName: string }) {
  const [last, setLast] = useState<LastShare | null | undefined>(undefined);
  useEffect(() => setLast(readLastShare(storageName)), [storageName]);
  if (last === undefined) return <p className="mt-4 text-sm text-chalk/70">Reading this browser.</p>;
  if (!last) {
    return (
      <>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Nothing to share yet.</h1>
        <p className="mt-2 text-sm text-chalk/70">Finish a raid on this browser and its card shows up here.</p>
        <a href="/home" className="chalk-focus mt-5 inline-flex min-h-11 items-center rounded-2xl bg-chalk px-5 font-sign text-ink">Play tonight&apos;s door</a>
      </>
    );
  }
  const text = shareText(last, last.budget);
  const doorHref = `/v/${encodeURIComponent(last.vaultId)}`;
  const title = last.kind === "out" ? "Turned away" : last.kind === "paid" ? "Got paid" : "Got in";
  return (
    <>
      <h1 className="mt-1 font-sign text-3xl leading-tight">{title}</h1>
      <article className={`mt-4 rounded-3xl border p-5 ${last.kind === "out" ? "border-rope/50" : "border-uv/50"} bg-night-2`}>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">Bouncer · {new Date(last.at).toLocaleDateString()}</p>
        <p className="mt-2 font-sign text-2xl leading-tight">{last.sign}</p>
        <p className="mt-3 text-2xl tracking-widest" aria-label="Your messages">{squares(last.grid)}</p>
        <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-chalk/80">{text}</pre>
      </article>
      <div className="mt-5 flex flex-col gap-3">
        <ShareButton text={text} url={doorHref} label={last.kind === "out" ? "Dare a friend" : "Share it"} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]" />
        <a href={doorHref} className="rounded-2xl border border-chalk/30 py-3 text-center text-sm">That door</a>
        <a href="/home" className="text-center text-sm text-chalk/70 underline decoration-white/20">Tonight&apos;s doors</a>
      </div>
    </>
  );
}
