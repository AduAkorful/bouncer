"use client";

import { useEffect, useState } from "react";
import { readSoundPref, writeSoundPref } from "@/lib/sound-pref";

/** The street sound choice, kept on this browser. The raid reads the same choice when it opens. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readSoundPref() === "on"), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Street sound"
      onClick={() => {
        writeSoundPref(!on);
        setOn(!on);
      }}
      className={`chalk-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-black/50 px-3 font-mono text-xs backdrop-blur ${className}`}
    >
      {on ? "♪ on" : "♪ off"}
    </button>
  );
}
