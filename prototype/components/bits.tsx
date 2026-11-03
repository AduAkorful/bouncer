import { CURRENCY, DEMO_LABEL, NETWORK_TAG } from "@/lib/demo/raider";

export const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Every money figure carries the network tag during the hackathon. */
export function Money({ amount, className = "", tag = true }: { amount: number; className?: string; tag?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-mono tnum">{usd(amount)}</span>
      {tag && <span className="font-mono text-[0.55em] tracking-wider opacity-70">{CURRENCY}</span>}
    </span>
  );
}

export function NetworkTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${className}`}
    >
      <span className="size-1.5 rounded-full bg-brass" aria-hidden />
      {NETWORK_TAG}
    </span>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-widest text-graphite ${className}`}>{DEMO_LABEL}</span>
  );
}

/** Venue names are painted signs. */
export function VenueSign({ name, area, size = "md" }: { name: string; area?: string; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "text-lg", md: "text-3xl", lg: "text-5xl sm:text-6xl" }[size];
  return (
    <div className="leading-none">
      <div className={`font-sign-inline ${cls} neon-uv`}>{name}</div>
      {area && <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-graphite">{area}</div>}
    </div>
  );
}

export function MessageDots({ used, budget }: { used: number; budget: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${budget - used} of ${budget} messages left`}>
      {Array.from({ length: budget }, (_, i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full ${i < used ? "bg-graphite/50" : "bg-chalk"}`}
        />
      ))}
      <span className="ml-1 font-mono text-[11px] text-chalk/60 tnum">{budget - used} left</span>
    </div>
  );
}

// The prototype's frame switcher lives in its own client file so it can open and close.
export { FrameNav } from "./FrameNav";
