"use client";

import { useState } from "react";

/**
 * Shares through the phone's share sheet, or copies the text and link where there is none. A browser that
 * will not copy (or never answers) gets the text in a box to copy by hand.
 */
export function ShareButton({ text, url, label = "Share", className = "" }: { text: string; url: string; label?: string; className?: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  async function share() {
    const full = new URL(url, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, url: full });
        return;
      } catch (error) {
        // Closing the share sheet is not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const body = `${text}\n${full}`;
    const copied = await Promise.race([
      navigator.clipboard?.writeText(body).then(() => true, () => false) ?? Promise.resolve(false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500)),
    ]);
    if (copied) {
      setNote("Copied. Paste it anywhere.");
      setTimeout(() => setNote(null), 2500);
    } else {
      setManual(body);
    }
  }
  return (
    <>
      <button type="button" onClick={() => void share()} className={className}>
        {label}
      </button>
      {note ? <span role="status" className="text-xs text-chalk/70">{note}</span> : null}
      {manual ? (
        <label className="block text-left text-xs text-chalk/70">
          Copy this and send it:
          <textarea readOnly value={manual} rows={5} onFocus={(event) => event.currentTarget.select()} autoFocus className="mt-1 w-full rounded-xl border border-white/15 bg-night p-2 font-mono text-xs text-chalk" />
        </label>
      ) : null}
    </>
  );
}
