import { EFUA, type Look } from "@/lib/look";
import { Bouncer } from "./Bouncer";
import { Person } from "./Person";

/**
 * The back office, past the door on boss nights: Madam Efua behind her desk under a banker's lamp, the safe,
 * a corkboard, the bin, and the club still thumping through the doorway. Things you can look at carry data-clue.
 */
export function OfficeScene({
  look = EFUA,
  p = "office",
  open = false,
  hints = false,
  className = "",
}: {
  look?: Look;
  p?: string;
  /** The safe stands open: you cracked the office */
  open?: boolean;
  /** Pulse rings on things worth a look */
  hints?: boolean;
  className?: string;
}) {
  const lamp = "#ffd99a";
  const ring = (cx: number, cy: number) =>
    hints ? (
      <g className="clue-ring" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r="9" fill="none" stroke="#efe8da" strokeWidth="1.4" />
      </g>
    ) : null;
  return (
    <svg viewBox="50 -40 300 290" preserveAspectRatio="xMidYMax meet" className={className} role="img" aria-label="Madam Efua's back office">
      <defs>
        <pattern id={`${p}-paper`} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#241828" />
          <path d="M8,2 q3,3 0,6 q-3,3 0,6" stroke="#2c1f31" strokeWidth="1.2" fill="none" />
          <circle cx="0" cy="8" r="1.2" fill="#2c1f31" />
          <circle cx="16" cy="8" r="1.2" fill="#2c1f31" />
        </pattern>
        <radialGradient id={`${p}-lamp`} cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor={lamp} stopOpacity="0.5" />
          <stop offset="0.6" stopColor={lamp} stopOpacity="0.08" />
          <stop offset="1" stopColor={lamp} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-club`} cx="0.5" cy="0.8" r="0.8">
          <stop offset="0" stopColor="#d9c9ff" />
          <stop offset="0.5" stopColor="#8f6bff" />
          <stop offset="1" stopColor="#5a1530" />
        </radialGradient>
        <radialGradient id={`${p}-safeGlow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6a0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#cfa349" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-desk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3a22" />
          <stop offset="1" stopColor="#2a1a10" />
        </linearGradient>
        <radialGradient id={`${p}-dark`} cx="0.55" cy="0.55" r="0.75">
          <stop offset="0.4" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.8" />
        </radialGradient>
      </defs>

      <rect x="-1000" y="-1000" width="2400" height="1250" fill={`url(#${p}-paper)`} />
      <rect x="-1000" y="150" width="2400" height="80" fill="#1a1120" />
      <line x1="-1000" x2="1400" y1="150" y2="150" stroke="#3a2a40" strokeWidth="2" />
      <rect x="-1000" y="230" width="2400" height="200" fill="#120c14" />

      {/* Doorway to the club: the party's light and noise come through */}
      <rect x="54" y="40" width="58" height="190" fill="#0d0912" />
      <rect id="club-light" x="58" y="44" width="50" height="186" fill={`url(#${p}-club)`} opacity="0.85" />
      <path d="M58,230 L108,230 L150,250 L20,250 Z" fill="#8f6bff" opacity="0.15" />
      <Person x={86} y={230} s={0.9} kind="barman" rim="#d9c9ff" index={0} gossip={hints} dark="#120a18" />

      {/* Corkboard */}
      <rect x="126" y="34" width="66" height="58" rx="2" fill="#6b4a2c" stroke="#3a2618" strokeWidth="3" />
      <g data-clue="flyer" style={hints ? { cursor: "pointer" } : undefined}>
        <rect x="132" y="40" width="26" height="34" fill="#efe8da" transform="rotate(-4 145 57)" />
        <text x="145" y="51" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="4.2" fill="#17141c" transform="rotate(-4 145 57)">
          FRI·SAT
        </text>
        <text x="145" y="60" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="3.6" fill="#b3243a" transform="rotate(-4 145 57)">
          SOUND BY
        </text>
        <text x="145" y="66" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="3.4" fill="#17141c" transform="rotate(-4 145 57)">
          SOUNDWAVE
        </text>
        <circle cx="145" cy="42" r="1.4" fill="#b3243a" />
        {ring(145, 57)}
      </g>
      <rect x="163" y="42" width="22" height="16" fill="#cfc5b1" transform="rotate(5 174 50)" />
      <rect x="166" y="62" width="18" height="24" fill="#8f6bff" opacity="0.7" transform="rotate(-3 175 74)" />
      <circle cx="174" cy="43" r="1.3" fill="#2c6e49" />

      {/* Calendar */}
      <rect x="204" y="40" width="30" height="36" fill="#efe8da" />
      <rect x="204" y="40" width="30" height="8" fill="#b3243a" />
      <g fill="#6e6875">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={207 + (i % 4) * 6.5} y={52 + Math.floor(i / 4) * 7} width="4" height="4" />
        ))}
      </g>
      <circle cx="226.5" cy="67" r="3.4" fill="none" stroke="#b3243a" strokeWidth="1" />

      {/* The safe */}
      <g>
        <rect x="262" y="96" width="78" height="134" rx="4" fill="#1d2a24" stroke="#0c120f" strokeWidth="3" />
        <rect x="268" y="102" width="66" height="122" rx="2" fill="#101914" />
        <ellipse id="safe-glow" cx="301" cy="163" rx="34" ry="52" fill={`url(#${p}-safeGlow)`} opacity={open ? 1 : 0} />
        <g opacity={open ? 1 : 0} id="safe-cash">
          {[0, 1, 2].map((r) => (
            <g key={r}>
              <rect x="278" y={196 - r * 22} width="22" height="14" rx="1" fill="#cfa349" />
              <rect x="302" y={196 - r * 22} width="22" height="14" rx="1" fill="#b38a37" />
            </g>
          ))}
        </g>
        <g id="safe-door" transform={open ? "translate(268 0) scale(0.12 1) translate(-268 0)" : undefined}>
          <rect x="268" y="102" width="66" height="122" rx="2" fill="#24352d" />
          <rect x="274" y="108" width="54" height="110" rx="2" fill="none" stroke="#33493e" strokeWidth="1.5" />
          <circle cx="301" cy="150" r="12" fill="#121a16" stroke="#cfa349" strokeWidth="1.5" />
          <g id="safe-dial">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="301" y1="140" x2="301" y2="142.5" stroke="#cfa349" strokeWidth="0.8" transform={`rotate(${i * 30} 301 150)`} />
            ))}
            <circle cx="301" cy="150" r="4" fill="#cfa349" />
          </g>
          <rect x="296" y="174" width="10" height="20" rx="2" fill="#cfa349" opacity="0.85" />
          <text x="301" y="214" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5" fill="#cfa349" opacity="0.6">
            VELVET
          </text>
        </g>
      </g>

      {/* Madam Efua */}
      <Bouncer look={look} x={200} y={238} scale={0.9} p={p} pose="seated" holds="ledger" rim={lamp} seated />

      {/* Desk */}
      <rect x="84" y="186" width="232" height="10" rx="2" fill="#6e4a2c" />
      <rect x="92" y="196" width="216" height="60" fill={`url(#${p}-desk)`} />
      <rect x="104" y="204" width="80" height="40" rx="2" fill="none" stroke="#2a1a10" strokeWidth="1.5" />
      <rect x="216" y="204" width="80" height="40" rx="2" fill="none" stroke="#2a1a10" strokeWidth="1.5" />

      {/* Bin with a screwed-up receipt */}
      <g data-clue="bin" style={hints ? { cursor: "pointer" } : undefined}>
        <path d="M72,214 L76,248 L96,248 L100,214 Z" fill="#2a2234" />
        <ellipse cx="86" cy="214" rx="14" ry="3" fill="#17121f" />
        <circle cx="84" cy="211" r="5" fill="#efe8da" />
        <path d="M80,209 l4,2 l3,-3 M81,213 l5,-1" stroke="#9c9483" strokeWidth="0.6" fill="none" />
        {ring(86, 210)}
      </g>

      {/* On the desk: water glass (the bass ripples it), a cash counter, the lamp */}
      <rect x="128" y="172" width="9" height="14" rx="1" fill="#cfe0ff" opacity="0.25" />
      <ellipse className="ripple" cx="132.5" cy="176" rx="3" ry="0.8" fill="none" stroke="#efe8da" strokeWidth="0.5" />
      <rect x="226" y="176" width="22" height="10" rx="2" fill="#2a2234" />
      <rect x="230" y="172" width="14" height="5" fill="#cfa349" opacity="0.8" />
      <g className="lamp-sway">
        <path d="M272,186 L272,160 Q272,154 266,152" stroke="#cfa349" strokeWidth="1.6" fill="none" />
        <path d="M246,150 Q258,138 274,150 Z" fill="#1f5a3a" />
        <rect x="264" y="183" width="16" height="4" rx="1" fill="#cfa349" />
      </g>
      <path id="lamp-light" d="M248,150 L150,236 L330,236 L272,150 Z" fill={`url(#${p}-lamp)`} style={{ mixBlendMode: "screen" }} pointerEvents="none" />
      <rect x="-1000" y="-1000" width="2400" height="1500" fill={`url(#${p}-dark)`} pointerEvents="none" />
    </svg>
  );
}
