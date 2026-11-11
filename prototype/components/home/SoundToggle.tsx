"use client";

import { useState } from "react";

/** The street sound choice. The prototype stays silent: the button only changes its label. */
export function SoundToggle({ className = "", initial = false }: { className?: string; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Street sound on" : "Street sound off"}
      onClick={() => setOn(!on)}
      className={`chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur ${className}`}
    >
      {on ? "♪ sound on" : "♪ sound off"}
    </button>
  );
}
