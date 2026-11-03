"use client";

import { useEffect, useState } from "react";

/** Speech bubbles from the queue: what's happening at the door right now. */
export function Chatter({ lines, className = "" }: { lines: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div key={i} className={`animate-[fadeIn_.35s_ease-out] ${className}`}>
      <div className="relative rounded-2xl rounded-bl-sm bg-chalk px-3 py-2 text-[12.5px] leading-snug text-ink shadow-lg">
        {lines[i % lines.length]}
      </div>
    </div>
  );
}
