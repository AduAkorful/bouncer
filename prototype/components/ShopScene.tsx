import type { ReactNode } from "react";
import type { Look } from "@/lib/look";
import { Bouncer } from "./Bouncer";

/**
 * Osu Cuts at dawn, the morning after: painted shop sign, hand-painted haircut boards, roller shutter half up,
 * the barber pole turning, and the bouncer out front with tea and the night's list. Light comes low from the right.
 */
export function ShopScene({
  look,
  name,
  p = "shop",
  className = "",
  front,
  label,
}: {
  look: Look;
  name: string;
  p?: string;
  className?: string;
  front?: ReactNode;
  label: string;
}) {
  const sun = "#ffb489";
  return (
    <svg viewBox="40 -70 320 320" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2045" />
          <stop offset="0.45" stopColor="#4e3a6e" />
          <stop offset="0.8" stopColor="#c46f72" />
          <stop offset="1" stopColor="#f3a77c" />
        </linearGradient>
        <radialGradient id={`${p}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe2b0" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#ffb489" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffb489" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#24384a" />
          <stop offset="0.7" stopColor="#2f4b58" />
          <stop offset="1" stopColor="#5a5a66" />
        </linearGradient>
        <linearGradient id={`${p}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f3e" />
          <stop offset="1" stopColor="#1c1622" />
        </linearGradient>
        <linearGradient id={`${p}-inside`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d0a12" />
          <stop offset="1" stopColor="#2a1f2e" />
        </linearGradient>
        <linearGradient id={`${p}-shaft`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={sun} stopOpacity="0.22" />
          <stop offset="1" stopColor={sun} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}-pole`}>
          <rect x="117" y="104" width="11" height="64" rx="5.5" />
        </clipPath>
      </defs>

      {/* Dawn sky over the rooftops */}
      <rect x="-1000" y="-1000" width="2400" height="1250" fill={`url(#${p}-sky)`} />
      <circle cx="330" cy="40" r="90" fill={`url(#${p}-sun)`} />
      <g fill="#efe8da" opacity="0.6">
        {[
          [70, -50],
          [120, -62],
          [180, -40],
          [240, -58],
          [96, -20],
        ].map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="0.8" />
        ))}
      </g>
      {/* Neighbours: corrugated roofs, a water tank, palms, power lines */}
      <g fill="#171a33">
        <path d="M-1000,4 L20,4 L44,-14 L98,-14 L104,4 L1400,4 L1400,80 L-1000,80 Z" />
        <rect x="56" y="-34" width="20" height="20" rx="2" />
        <rect x="58" y="-38" width="16" height="5" rx="2" />
        <path d="M300,4 L300,-26 L336,-36 L372,-26 L372,4 Z" />
        <path d="M352,40 L351,-40 L354,-40 L355,40 Z" />
        <path d="M353,-40 q-20,-6 -30,6 q14,-8 30,-2 q-16,0 -24,14 q14,-14 26,-12 q-4,10 0,22 q2,-14 0,-22 q14,-2 26,12 q-8,-14 -24,-14 q16,-6 30,2 q-10,-12 -32,-6 Z" />
        <path d="M24,40 L23,-10 L26,-10 L27,40 Z" />
        <path d="M25,-10 q-18,-4 -26,8 q12,-8 26,-4 q-12,2 -18,14 q10,-12 20,-10 q8,-2 22,10 q-8,-14 -22,-12 q14,-4 26,4 q-8,-12 -28,-10 Z" />
      </g>
      <path d="M-100,-10 Q120,14 400,-24" stroke="#0f1028" strokeWidth="0.8" fill="none" />
      <path d="M-100,-2 Q120,22 400,-16" stroke="#0f1028" strokeWidth="0.8" fill="none" />
      <path d="M212,9 l3,-3 l3,3 l-3,1 Z" fill="#0f1028" />

      {/* The shop */}
      <rect x="60" y="-4" width="280" height="228" fill={`url(#${p}-wall)`} />
      <rect x="60" y="-4" width="280" height="6" fill="#16253a" />
      <rect x="336" y="-4" width="4" height="228" fill={sun} opacity="0.35" />
      {/* Painted sign board */}
      <rect x="108" y="8" width="184" height="38" rx="2" fill="#efe2c4" />
      <rect x="108" y="8" width="184" height="5" fill="#b3243a" />
      <rect x="108" y="41" width="184" height="5" fill="#3b4a8f" />
      <text x="200" y="35" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="19" fill="#17141c">
        {name.toUpperCase()}
      </text>
      <text x="286" y="20.5" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="4" fill="#17141c" opacity="0.7">
        UNISEX · SINCE 2009
      </text>
      {/* Hand-painted haircut boards, the way barbershops on this street advertise */}
      <HaircutBoard x={72} y={92} cut="flat" />
      <HaircutBoard x={292} y={92} cut="waves" />

      {/* Door: shutter half up, the shop dark inside */}
      <rect x="152" y="92" width="96" height="132" fill={`url(#${p}-inside)`} />
      <g opacity="0.85">
        {/* barber chair and mirror inside */}
        <rect x="170" y="112" width="60" height="30" rx="2" fill="#3a3145" opacity="0.6" />
        <path d="M188,190 L188,168 Q188,158 198,158 L208,158 Q214,158 214,168 L214,190 Z M184,176 h34 v6 h-34 Z" fill="#06040a" />
      </g>
      <rect x="150" y="90" width="100" height="34" fill="#4a4e5c" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="150" x2="250" y1={93 + i * 4} y2={93 + i * 4} stroke="#2e3140" strokeWidth="1" />
      ))}
      <rect x="150" y="122" width="100" height="3" fill="#2e3140" />
      <rect x="146" y="88" width="108" height="4" fill="#16253a" />
      <rect x="196" y="125" width="8" height="4" rx="1" fill="#6e6875" />

      {/* Barber pole, turning */}
      <rect x="114" y="100" width="17" height="6" rx="2" fill="#c9c3cf" />
      <rect x="114" y="166" width="17" height="6" rx="2" fill="#c9c3cf" />
      <rect x="117" y="104" width="11" height="64" rx="5.5" fill="#efe8da" />
      <g clipPath={`url(#${p}-pole)`}>
        <g className="pole-stripes">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M117,${106 + i * 8} l11,-7 l0,4 l-11,7 Z`} fill={i % 2 ? "#3b4a8f" : "#b3243a"} />
          ))}
        </g>
      </g>
      <rect x="125" y="104" width="2" height="64" fill="#fff" opacity="0.35" />

      {/* Plastic chair and a broom against the wall */}
      <g opacity="0.95">
        <path d="M274,224 L276,190 L304,190 L306,224 M276,200 h30 M280,190 L282,160 Q292,154 302,160 L300,190" stroke="#d9d2c3" strokeWidth="3" fill="none" strokeLinejoin="round" />
        <path d="M262,224 L254,150" stroke="#7a5634" strokeWidth="2" />
        <path d="M262,224 l-8,-14 l14,-2 Z" fill="#9a7b46" />
      </g>

      {/* Morning sun on the pavement, long shadows to the left */}
      <rect x="-1000" y="224" width="2400" height="200" fill={`url(#${p}-ground)`} />
      <line x1="-1000" x2="1400" y1="224.5" y2="224.5" stroke="#5a4a5e" strokeWidth="1" />
      <path d="M-1000,232 L1400,232" stroke="#140f18" strokeWidth="1.5" />
      <rect x="60" y="-4" width="280" height="228" fill={`url(#${p}-shaft)`} style={{ mixBlendMode: "screen" }} />
      <ellipse cx="160" cy="228" rx="70" ry="6" fill="#000" opacity="0.4" />

      <Bouncer look={look} x={196} y={228} scale={0.9} p={p} pose="tea" rim={sun} />
      {front}
    </svg>
  );
}

function HaircutBoard({ x, y, cut }: { x: number; y: number; cut: "flat" | "waves" }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-2" y="-2" width="40" height="52" rx="2" fill="#16253a" />
      <rect width="36" height="48" rx="1" fill="#e9dcc0" />
      <circle cx="18" cy="22" r="9" fill="#6b4430" />
      <rect x="13" y="30" width="10" height="6" fill="#6b4430" />
      <path d="M6,48 Q6,36 18,36 Q30,36 30,48 Z" fill="#3b4a8f" />
      {cut === "flat" ? <rect x="9" y="8" width="18" height="9" rx="1" fill="#17141c" /> : <path d="M9,18 Q9,10 18,10 Q27,10 27,18 Q22,15 18,16 Q13,15 9,18 Z" fill="#17141c" />}
      {cut === "waves" && <path d="M11,14 q3,-2 6,0 t6,0" stroke="#6e6875" strokeWidth="0.8" fill="none" />}
      <text x="18" y="6" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="4" fill="#b3243a">
        {cut === "flat" ? "FLAT TOP" : "WAVES"}
      </text>
    </g>
  );
}
