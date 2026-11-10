import { useId } from "react";
import { stampPattern } from "@/lib/stamp";

interface ApprovedProps {
  signature: string;
  ring: string;
  size?: number;
  glow?: boolean;
  className?: string;
}

/** The approved stamp: UV ink whose pattern is drawn from the verdict signature. */
export function ApprovedStamp({ signature, ring, size = 220, glow = true, className = "" }: ApprovedProps) {
  const id = useId().replace(/:/g, "");
  const p = stampPattern(signature);
  const ticks = Array.from({ length: p.ticks }, (_, i) => (360 / p.ticks) * i);

  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Approved stamp"
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 6px rgb(143 107 255 / .85)) drop-shadow(0 0 24px rgb(143 107 255 / .45))" } : undefined}
    >
      <defs>
        <path id={`ring-${id}`} d="M0,-84 A84,84 0 1,1 -0.01,-84" />
        <filter id={`ink-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.4" />
        </filter>
      </defs>
      <g fill="none" stroke="var(--uv-glow)" filter={`url(#ink-${id})`}>
        <circle r="97" strokeWidth="3" />
        <circle r="74" strokeWidth="1.4" />
        <text fill="var(--uv-glow)" stroke="none" fontFamily="var(--font-bungee)" fontSize="11.5" letterSpacing="2.2">
          <textPath href={`#ring-${id}`}>{ring}</textPath>
        </text>
        <g transform={`rotate(${p.rotation})`}>
          {ticks.map((a) => (
            <line key={a} x1="0" y1="-70" x2="0" y2="-66" strokeWidth="1" transform={`rotate(${a})`} />
          ))}
          <path d={p.rose} strokeWidth="0.8" opacity="0.9" />
          <path d={p.rose} strokeWidth="0.5" opacity="0.55" transform="rotate(12) scale(.82)" />
          <path d={p.spiro} strokeWidth="0.6" opacity="0.8" />
        </g>
        <rect x="-34" y="-15" width="68" height="30" rx="3" fill="var(--night)" stroke="var(--uv-glow)" strokeWidth="2" />
        <text
          x="0"
          y="9"
          textAnchor="middle"
          fill="var(--uv-glow)"
          stroke="none"
          fontFamily="var(--font-bungee)"
          fontSize="22"
        >
          IN
        </text>
      </g>
    </svg>
  );
}

/** The refused stamp: flat rope-red rubber, no pattern, no drama. */
export function RefusedStamp({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 128 40" width="104" height="33" role="img" aria-label="Refused" className={className}>
      <defs>
        <filter id={`rub-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#rub-${id})`} transform="rotate(-5 64 20)">
        <rect x="3" y="3" width="122" height="34" rx="3" fill="none" stroke="var(--rope)" strokeWidth="3" />
        <text x="64" y="28" textAnchor="middle" fill="var(--rope)" fontFamily="var(--font-bungee)" fontSize="19" letterSpacing="2">
          REFUSED
        </text>
      </g>
    </svg>
  );
}

/** The end of a raid that ran out of messages: a wider, rougher stamp than a single refused bill. */
export function TurnedAwayStamp({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 84" width="220" height="84" role="img" aria-label="Turned away" className={className}>
      <defs>
        <filter id={`rub-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#rub-${id})`} transform="rotate(-7 110 42)">
        <rect x="4" y="4" width="212" height="76" rx="6" fill="none" stroke="var(--rope)" strokeWidth="4" />
        <rect x="11" y="11" width="198" height="62" rx="3" fill="none" stroke="var(--rope)" strokeWidth="1.5" />
        <text x="110" y="40" textAnchor="middle" fill="var(--rope)" fontFamily="var(--font-bungee)" fontSize="24" letterSpacing="2">TURNED AWAY</text>
        <text x="110" y="62" textAnchor="middle" fill="var(--rope)" fontFamily="var(--font-jetbrains)" fontSize="10" letterSpacing="3">NOT TONIGHT</text>
      </g>
    </svg>
  );
}
