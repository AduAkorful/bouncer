export const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Every money figure carries the network tag during the hackathon. */
export function Money({
  amount,
  text,
  currency,
  className = "",
  tag = true,
}: {
  amount?: number;
  text?: string;
  currency?: string | null;
  className?: string;
  tag?: boolean;
}) {
  const unit = currency || null;
  const shown = text ?? (typeof amount === "number" ? usd(amount) : null);
  if (!shown) return null;
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-mono tnum">{shown}</span>
      {tag && unit ? <span className="font-mono text-[0.55em] tracking-wider opacity-90">{unit}</span> : null}
    </span>
  );
}

export function NetworkTag({ className = "", label }: { className?: string; label?: string }) {
  const text = label ?? process.env.NEXT_PUBLIC_NETWORK_TAG;
  if (!text) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${className}`}
    >
      <span className="size-1.5 rounded-full bg-brass" aria-hidden />
      {text}
    </span>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  const text = process.env.NEXT_PUBLIC_SCREEN_NOTE;
  if (!text) return null;
  return <span className={`font-mono text-[10px] uppercase tracking-widest text-graphite ${className}`}>{text}</span>;
}
