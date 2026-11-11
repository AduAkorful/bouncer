"use client";

import { Suspense, use, useEffect, useRef, type ReactNode } from "react";
import { Money } from "@/components/bits";
import type { TokenRead } from "@/lib/page-vault";
import { TOKEN_FAILED, TOKEN_READING, tokenAmount } from "@/lib/token-label";

export function TokenBridge({ token, onReady }: { token: Promise<TokenRead>; onReady: (label: TokenRead) => void }) {
  const label = use(token);
  const report = useRef(onReady);
  report.current = onReady;
  useEffect(() => {
    report.current(label);
  }, [label]);
  return null;
}

export function TokenAmount({
  token,
  atomic,
  className = "",
}: {
  token: Promise<TokenRead>;
  atomic: string;
  className?: string;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-chalk/70">{TOKEN_READING}</p>}>
      <Ready token={token} atomic={atomic} className={className} />
    </Suspense>
  );
}

function Ready({ token, atomic, className }: { token: Promise<TokenRead>; atomic: string; className: string }) {
  const shown = tokenAmount(use(token), atomic);
  if (shown.kind !== "ready") return <p className="text-sm text-chalk/70">{TOKEN_FAILED}</p>;
  return <Money text={shown.text} currency={shown.symbol} className={className} />;
}

export function TokenWord({ token, children }: { token: Promise<TokenRead>; children: (symbol: string) => ReactNode }) {
  return (
    <Suspense fallback={<p className="text-sm text-chalk/70">{TOKEN_READING}</p>}>
      <Word token={token}>{children}</Word>
    </Suspense>
  );
}

function Word({ token, children }: { token: Promise<TokenRead>; children: (symbol: string) => ReactNode }) {
  const label = use(token);
  if (!label.ok) return <p className="text-sm text-chalk/70">{TOKEN_FAILED}</p>;
  return children(label.symbol);
}

/** Amount lines inside the door's pot board. */
export function TokenPotGlyph({ token, atomic }: { token: Promise<TokenRead>; atomic: string }) {
  return (
    <Suspense fallback={<PotWords line={TOKEN_READING} />}>
      <PotReady token={token} atomic={atomic} />
    </Suspense>
  );
}

function PotReady({ token, atomic }: { token: Promise<TokenRead>; atomic: string }) {
  const shown = tokenAmount(use(token), atomic);
  if (shown.kind !== "ready") return <PotWords line={TOKEN_FAILED} />;
  return (
    <>
      <text x="306" y="188" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="11" fill="#f0d48f">
        {shown.text}
      </text>
      <text x="306" y="202" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" fill="#efe8da" opacity="0.75">
        {shown.symbol}
      </text>
    </>
  );
}

function PotWords({ line }: { line: string }) {
  const words = line.replace(/\.$/, "").split(" ");
  const rows = words.length > 3 ? [words.slice(0, 2).join(" "), words.slice(2, 4).join(" "), words.slice(4).join(" ")] : [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
  return (
    <text x="306" y="182" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.2" fill="#efe8da">
      {rows.filter(Boolean).map((row, index) => (
        <tspan key={row} x="306" dy={index === 0 ? 0 : 5.2}>
          {row}
        </tspan>
      ))}
    </text>
  );
}
