// The street around the door: what's going on either side of the queue. Classes are hooks for lib/idle.ts.
import type { PosterSlips } from "@/lib/street-setting";
import { Goer, type GoerLook } from "./Goer";

/** A small "i" on things you can tap to learn about. */
export function LearnBadge({ x, y, show }: { x: number; y: number; show: boolean }) {
  if (!show) return null;
  return (
    <g className="learn-badge" transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r="5" fill="#17141c" stroke="#efe8da" strokeWidth="1" />
      <text y="2.4" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="6.5" fill="#efe8da">
        i
      </text>
    </g>
  );
}

const VENDOR: GoerLook = { skin: "#4a2e1f", top: "#2c6e49", bottom: "#1d1727", hair: "headwrap", hairColor: "#1c120c", accent: "#cfa349", outfit: "apron", pose: "still" };
const EATER: GoerLook = { skin: "#6b4430", top: "#3b4a8f", bottom: "#2a2234", hair: "low", hairColor: "#1c120c", outfit: "tee", pose: "hold", accent: "#efe8da" };
const WATER: GoerLook = { skin: "#3b2417", top: "#b3243a", bottom: "#2a2234", hair: "bald", hairColor: "#1c120c", outfit: "tee", pose: "basin", accent: "#efe8da" };

/** Suya stand: a cart, a grill of glowing coals, smoke, one bare bulb, the vendor and a customer. */
export function SuyaStand({ x, p, rim, gossip, speaks, index }: { x: number; p: string; rim: string; gossip: boolean; speaks: boolean; index: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <clipPath id={`${p}-vendor-upper`}>
          <rect x="-40" y="70" width="80" height="102" />
        </clipPath>
        <radialGradient id={`${p}-coal`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-bulbWarm`} cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#ffd48a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffd48a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Bulb on a pole, its light on the cart and the pavement */}
      <path d="M-52,222 V112 H6" stroke="#0d0a12" strokeWidth="3" fill="none" />
      <path d="M0,112 V122" stroke="#0d0a12" strokeWidth="1" />
      <ellipse cx="0" cy="170" rx="70" ry="62" fill={`url(#${p}-bulbWarm)`} style={{ mixBlendMode: "screen" }} />
      <circle className="bulb-warm" cx="0" cy="125" r="3.2" fill="#fff1c8" />
      <ellipse cx="0" cy="225" rx="64" ry="7" fill="#ffb060" opacity="0.14" />

      <g clipPath={`url(#${p}-vendor-upper)`}>
        <Goer x={4} y={208} s={0.8} look={VENDOR} rim="#ffb060" dark={0.15} index={index} gossip={speaks} />
      </g>

      {/* Cart */}
      <g data-learn="food" style={gossip ? { cursor: "pointer" } : undefined}>
      <rect x="-40" y="172" width="80" height="34" rx="2" fill="#5a3a22" />
      <rect x="-40" y="172" width="80" height="4" fill="#7a5634" />
      <rect x="-30" y="180" width="60" height="20" rx="1" fill="#b3243a" />
      <text x="0" y="194" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="11" fill="#efe8da">
        SUYA
      </text>
      <text x="0" y="203.5" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4" fill="#efe8da" opacity="0.8">
        KEBAB · KELEWELE · ₵
      </text>
      <rect x="-36" y="166" width="72" height="7" rx="1" fill="#17121f" />
      <rect className="coals" x="-32" y="167" width="64" height="3" fill="#ff7a3a" />
      <ellipse className="coals" cx="0" cy="166" rx="44" ry="12" fill={`url(#${p}-coal)`} style={{ mixBlendMode: "screen" }} />
      <g stroke="#c9a27a" strokeWidth="1.2">
        {[-24, -14, -4, 6, 16, 26].map((sx) => (
          <line key={sx} x1={sx - 3} y1="168" x2={sx + 3} y2="163" />
        ))}
      </g>
      <g fill="#9c9483">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} className="smoke" cx={-10 + i * 4} cy="160" r={3 + (i % 3)} opacity="0" />
        ))}
      </g>
      <circle cx="-26" cy="212" r="9" fill="#0d0a12" />
      <circle cx="-26" cy="212" r="3" fill="#3a3145" />
      <circle cx="26" cy="212" r="9" fill="#0d0a12" />
      <circle cx="26" cy="212" r="3" fill="#3a3145" />
      <rect x="-40" y="172" width="2" height="34" fill="#ffb060" opacity="0.4" />
      </g>
      <LearnBadge x={34} y={184} show={gossip} />

      <Goer x={60} y={222} s={0.76} look={EATER} rim="#ffb060" dark={0.25} flip />
    </g>
  );
}

/** Water seller wandering the queue with a basin of sachets on her head. */
export function WaterSeller({ x, rim, gossip, index }: { x: number; rim: string; gossip: boolean; index: number }) {
  return (
    <g className="wander">
      <Goer x={x} y={230} s={0.84} look={WATER} rim={rim} dark={0.2} index={index} gossip={gossip} />
    </g>
  );
}

/** Posters pasted on the club wall. The lineup poster can be read and pinned. */
export function PosterWall({ x, hints, slips }: { x: number; hints: boolean; slips: PosterSlips }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g transform="rotate(-4 -40 92)">
        <rect x="-58" y="70" width="32" height="44" fill="#4a2f8f" />
        <text x="-42" y="86" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5.5" fill="#efe8da">
          {slips.purple[0]}
        </text>
        <text x="-42" y="94" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5.5" fill="#efe8da">
          {slips.purple[1]}
        </text>
        <text x="-42" y="106" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="3.6" fill="#cbb8ff">
          {slips.purple[2]}
        </text>
      </g>
      <g data-clue="poster" style={hints ? { cursor: "pointer" } : undefined}>
        <g transform="rotate(2 0 90)">
          <rect x="-19" y="58" width="38" height="62" fill="#efe8da" />
          <rect x="-19" y="58" width="38" height="11" fill="#17141c" />
          <text x="0" y="66" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize={slips.signSize} fill="#cbb8ff">
            {slips.sign}
          </text>
          <text x="0" y="78" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="3.2" fill="#17141c">
            {slips.cream[0]}
          </text>
          <text x="0" y="89" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5" fill="#b3243a">
            {slips.cream[1]}
          </text>
          <text x="0" y="99" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="4.2" fill="#17141c">
            {slips.cream[2]}
          </text>
          <text x="0" y="110" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="3.2" fill="#17141c">
            {slips.cream[3]}
          </text>
        </g>
        {hints && (
          <g className="clue-ring" style={{ transformOrigin: "0px 89px" }}>
            <circle cx="0" cy="89" r="16" fill="none" stroke="#efe8da" strokeWidth="1.4" />
          </g>
        )}
      </g>
      <g transform="rotate(-2 40 92)">
        <path d="M24,74 h30 v30 l-6,4 l-5,-3 l-6,5 l-5,-4 l-8,3 Z" fill="#b3243a" />
        <text x="39" y="88" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5" fill="#efe8da">
          {slips.flag[0]}
        </text>
        <text x="39" y="96" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5" fill="#efe8da">
          {slips.flag[1]}
        </text>
      </g>
      <text x="-6" y="138" textAnchor="middle" fontFamily="var(--font-bungee-inline)" fontSize="16" fill="none" stroke="#8f6bff" strokeWidth="0.8" opacity="0.35" transform="rotate(-6 -6 132)">
        {slips.wall}
      </text>
    </g>
  );
}

/** An upstairs window of the club: lasers sweeping, a strobe, heads bobbing. */
export function VipWindow({ x, y, p, id }: { x: number; y: number; p: string; id: string }) {
  const cid = `${p}-vip-${id}`;
  return (
    <g>
      <defs>
        <clipPath id={cid}>
          <rect x={x + 2} y={y + 2} width="32" height="40" />
        </clipPath>
      </defs>
      <rect x={x} y={y} width="36" height="44" fill="#0b0810" stroke="#2a2234" strokeWidth="2" />
      <g clipPath={`url(#${cid})`}>
        <rect x={x + 2} y={y + 2} width="32" height="40" fill="#2a1446" />
        <g className="laser" style={{ transformOrigin: `${x + 18}px ${y + 44}px` }}>
          {[-30, -12, 6, 24].map((a, i) => (
            <line key={a} x1={x + 18} y1={y + 44} x2={x + 18 + Math.sin((a * Math.PI) / 180) * 60} y2={y + 44 - Math.cos((a * Math.PI) / 180) * 60} stroke={i % 2 ? "#5dffb0" : "#b9a2ff"} strokeWidth="0.9" opacity="0.85" />
          ))}
        </g>
        <rect className="strobe" x={x + 2} y={y + 2} width="32" height="40" fill="#fff" opacity="0" />
        <g fill="#0d0716">
          {[6, 14, 22, 30].map((dx, i) => (
            <g key={dx} className="dancer">
              <circle cx={x + dx} cy={y + 34 + (i % 2) * 2} r="3.2" />
              <rect x={x + dx - 4} y={y + 37 + (i % 2) * 2} width="8" height="10" rx="3" />
            </g>
          ))}
        </g>
      </g>
      <line x1={x + 18} y1={y} x2={x + 18} y2={y + 44} stroke="#0b0810" strokeWidth="1.5" />
    </g>
  );
}

/** Next door: a concrete block with a shuttered shop and a top-up kiosk under a flickering tube. */
const KEEPER: GoerLook = { skin: "#6b4430", top: "#8f6bff", bottom: "#1d1727", hair: "bun", hairColor: "#1c120c", outfit: "tee", pose: "phone" };

export function NextDoor({ x, p, ad, kiosk, shutter, hints }: { x: number; p: string; ad: [string, string, string]; kiosk: string; shutter: string; hints: boolean }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <radialGradient id={`${p}-lampWall`} cx="0" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${p}-kiosk-opening`}>
          <rect x="152" y="158" width="66" height="48" />
        </clipPath>
      </defs>
      <rect x="0" y="-400" width="500" height="622" fill="#1f1b26" />
      {/* Damp patches on old plaster */}
      <g fill="#17141d">
        <ellipse cx="300" cy="40" rx="60" ry="26" />
        <ellipse cx="90" cy="110" rx="40" ry="14" />
        <rect x="0" y="190" width="500" height="32" />
      </g>
      <rect x="0" y="-60" width="260" height="280" fill={`url(#${p}-lampWall)`} />
      {/* A hand-painted wall ad, the way chop bars advertise */}
      <g transform="translate(150 40) rotate(-1)" data-learn="ad" style={hints ? { cursor: "pointer" } : undefined}>
        <rect x="-4" y="-4" width="170" height="54" fill="#d9c7a0" opacity="0.12" />
        <text x="0" y="16" fontFamily="var(--font-bungee)" fontSize="14" fill="#e9b52a" opacity="0.75">
          {ad[0]}
        </text>
        <text x="0" y="34" fontFamily="var(--font-bungee)" fontSize="11" fill="#b3243a" opacity="0.75">
          {ad[1]}
        </text>
        <text x="0" y="45" fontFamily="var(--font-jetbrains)" fontSize="5" fill="#d9c7a0" opacity="0.6">
          {ad[2]}
        </text>
        <LearnBadge x={166} y={0} show={hints} />
      </g>
      <rect x="0" y="-400" width="10" height="622" fill="#0b0810" />
      <rect x="10" y="-400" width="2" height="622" fill="#2a2234" />
      {/* Lit flats upstairs */}
      {[40, 120, 200].map((wx, i) => (
        <g key={wx}>
          <rect x={wx} y="-60" width="34" height="40" fill="#0b0810" stroke="#26212e" strokeWidth="2" />
          <rect x={wx + 2} y="-58" width="30" height="36" fill={i === 1 ? "#7ab0ff" : "#f0c27a"} opacity={i === 2 ? 0.05 : 0.14} />
          {i === 1 && <rect className="tv" x={wx + 2} y="-58" width="30" height="36" fill="#7ab0ff" opacity="0.1" />}
        </g>
      ))}
      {/* Shuttered shop */}
      <g transform="translate(120 0)">
      <rect x="30" y="140" width="90" height="82" fill="#2b2833" />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={i} x1="30" x2="120" y1={143 + i * 5} y2={143 + i * 5} stroke="#1c1a22" strokeWidth="1.2" />
      ))}
      <text x="75" y="186" textAnchor="middle" fontFamily="var(--font-bungee-inline)" fontSize="13" fill="none" stroke="#5dffb0" strokeWidth="0.6" opacity="0.3" transform="rotate(-8 75 182)">
        {shutter}
      </text>
      <rect x="24" y="132" width="102" height="8" fill="#121016" />
      </g>
      {/* Kiosk */}
      <g transform="translate(-120 0)" data-learn="kiosk" style={hints ? { cursor: "pointer" } : undefined}>
      <rect x="150" y="150" width="70" height="72" fill="#16131b" />
      <rect x="152" y="162" width="66" height="44" fill="#1f2a30" />
      <rect className="tube" x="156" y="154" width="58" height="3" rx="1.5" fill="#dff4ff" />
      <rect className="tube" x="152" y="157" width="66" height="50" fill="#dff4ff" opacity="0.1" />
      <g>
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4, 5].map((c) => (
            <rect key={`${r}${c}`} x={156 + c * 10} y={166 + r * 12} width="7" height="8" rx="1" fill={["#cfa349", "#b3243a", "#3b4a8f", "#2c6e49", "#efe8da", "#8f6bff"][(r + c) % 6]} opacity="0.75" />
          )),
        )}
      </g>
      <g data-kiosk-attendant clipPath={`url(#${p}-kiosk-opening)`}>
        <Goer x={200} y={232} s={0.62} look={KEEPER} rim="#dff4ff" dark={0.2} />
      </g>
      <rect x="146" y="206" width="78" height="6" fill="#2a2234" />
      <rect x="146" y="128" width="78" height="18" fill="#efe8da" />
      <text x="185" y="140" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="6" fill="#17141c">
        {kiosk}
      </text>
      <LearnBadge x={222} y={130} show={hints} />
      <ellipse cx="185" cy="226" rx="50" ry="6" fill="#dff4ff" opacity="0.08" />
      <g className="open-sign">
        <rect x="226" y="160" width="30" height="14" rx="3" fill="none" stroke="#ff6b82" strokeWidth="1.4" />
        <text x="241" y="170.5" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="7" fill="#ff9aab">
          24H
        </text>
      </g>
      </g>
    </g>
  );
}

/** An Accra taxi at the kerb, engine running, driver's elbow resting at the window. */
export function Taxi({ x, p, rim, gossip, speaks, index }: { x: number; p: string; rim: string; gossip: boolean; speaks: boolean; index: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <clipPath id={`${p}-driver-window`}>
          <path d="M-56,214 Q-48,200 -30,199 L-4,199 L-4,214 Z" />
        </clipPath>
      </defs>
      <ellipse cx="0" cy="256" rx="84" ry="5" fill="#000" opacity="0.6" />
      {/* Headlight beam reaching left along the kerb */}
      <path d="M-78,236 L-200,214 L-200,262 Z" fill="#fff6d8" opacity="0.08" />
      <g data-learn="vehicle" style={gossip ? { cursor: "pointer" } : undefined}>
      <path d="M-62,214 Q-52,196 -30,194 L34,194 Q50,196 60,214 Z" fill="#2c3242" />
      <path d="M-56,214 Q-48,200 -30,199 L-4,199 L-4,214 Z M2,199 L32,199 Q44,201 52,214 L2,214 Z" fill="#141a26" />
      <path d="M-56,214 Q-48,200 -30,199" stroke={rim} strokeOpacity="0.4" strokeWidth="0.8" fill="none" />
      <path d="M-84,236 Q-84,216 -62,214 L66,214 Q84,216 84,236 L84,248 L-84,248 Z" fill="#3a4152" />
      {/* Yellow corners: the mark of a taxi here */}
      <path d="M-84,236 Q-84,216 -62,214 L-46,214 L-46,248 L-84,248 Z" fill="#e9b52a" />
      <path d="M84,236 Q84,216 62,214 L48,214 L48,248 L84,248 Z" fill="#e9b52a" />
      <rect x="-16" y="186" width="28" height="9" rx="2" fill="#efe8da" />
      <text x="-2" y="193" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="6" fill="#17141c">
        TAXI
      </text>
      <rect x="-84" y="232" width="7" height="5" rx="1.5" fill="#fff6d8" />
      <rect x="80" y="232" width="4" height="5" rx="1" fill="#ff3a4a" />
      <line x1="-84" x2="84" y1="224" y2="224" stroke="#000" strokeOpacity="0.25" />
      <circle cx="-50" cy="249" r="11" fill="#0b0810" />
      <circle cx="-50" cy="249" r="4.5" fill="#6e6875" />
      <circle cx="50" cy="249" r="11" fill="#0b0810" />
      <circle cx="50" cy="249" r="4.5" fill="#6e6875" />
      </g>
      <LearnBadge x={40} y={228} show={gossip} />
      {/* Driver */}
      <g data-person={index} style={speaks ? { cursor: "pointer" } : undefined}>
        <g data-taxi-driver clipPath={`url(#${p}-driver-window)`}>
          <circle cx="-22" cy="205" r="5.5" fill="#3b2417" />
          <path d="M-29,216 Q-29,210 -22,209 Q-15,210 -15,216 Z" fill="#efe8da" />
          <path d="M-24,212 L-35,212" stroke="#3b2417" strokeWidth="3" strokeLinecap="round" />
        </g>
        {speaks && <rect x="-46" y="190" width="34" height="26" fill="transparent" />}
        {speaks && (
          <g className="gossip-hint" transform="translate(-22 180)">
            <path d="M-8,-6 h16 a3,3 0 0 1 3,3 v6 a3,3 0 0 1 -3,3 h-9 l-4,4 v-4 h-3 a3,3 0 0 1 -3,-3 v-6 a3,3 0 0 1 3,-3 Z" fill="#efe8da" />
            <g fill="#17141c">
              <circle cx="-4" cy="0" r="1.3" />
              <circle cx="0" cy="0" r="1.3" />
              <circle cx="4" cy="0" r="1.3" />
            </g>
          </g>
        )}
      </g>
      <g fill="#9c9483">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="exhaust" cx="90" cy="246" r={2.5 + i} opacity="0" />
        ))}
      </g>
    </g>
  );
}

/** An okada (motorbike taxi) that crosses the front of the scene now and then. */
export function Okada() {
  return (
    <g id="okada" className="passer" data-learn="passer" data-sound="moto" transform="translate(-600 0)">
      <path d="M-30,250 L-140,236 L-140,262 Z" fill="#fff6d8" opacity="0.12" />
      <circle cx="-22" cy="254" r="9" fill="#0b0810" stroke="#3a3145" strokeWidth="2" />
      <circle cx="22" cy="254" r="9" fill="#0b0810" stroke="#3a3145" strokeWidth="2" />
      <path d="M-22,254 L-8,238 L16,238 L22,254 M-8,238 L-14,230" stroke="#b3243a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="-30" y="236" width="6" height="4" rx="1" fill="#fff6d8" />
      <path d="M0,236 L4,214 Q6,206 2,200" stroke="#2c6e49" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M2,214 L-12,226" stroke="#2c6e49" strokeWidth="4" strokeLinecap="round" />
      <path d="M4,236 L-2,250" stroke="#1d1727" strokeWidth="5" strokeLinecap="round" />
      <circle cx="1" cy="194" r="7" fill="#e9b52a" />
      <path d="M-6,194 L8,194" stroke="#0b0810" strokeWidth="2" />
            <path d="M14,232 L16,212" stroke="#3b4a8f" strokeWidth="7" strokeLinecap="round" />
      <circle cx="16" cy="203" r="6" fill="#4a2e1f" />
    </g>
  );
}

const KEBAB_MAN: GoerLook = { skin: "#c99a72", top: "#efe8da", bottom: "#1d1727", hair: "low", hairColor: "#2a1a10", outfit: "tee", pose: "still" };
const ROSES: GoerLook = { skin: "#a8754f", top: "#2a2234", bottom: "#1d1727", hair: "bun", hairColor: "#2a1a10", outfit: "jacket", pose: "hold", accent: "#b3243a" };

/** A kebab van: serving hatch, lit menu, the doner turning, steam, someone at the hatch. */
export function KebabVan({ x, p, gossip, speaks, index }: { x: number; p: string; gossip: boolean; speaks: boolean; index: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <linearGradient id={`${p}-hatch`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c8" />
          <stop offset="1" stopColor="#e9c47a" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="226" rx="80" ry="8" fill="#fff1c8" opacity="0.1" />
      <g data-learn="food" style={gossip ? { cursor: "pointer" } : undefined}>
        <path d="M-70,212 L-70,150 Q-70,140 -60,140 L40,140 Q52,140 58,152 L72,180 L72,212 Z" fill="#e8e4dc" />
        <path d="M44,146 L56,154 L66,178 L44,178 Z" fill="#2a3442" />
        <rect x="-60" y="152" width="90" height="40" rx="2" fill={`url(#${p}-hatch)`} />
        <rect x="-62" y="150" width="94" height="6" fill="#b3243a" />
        <rect x="-62" y="192" width="94" height="5" fill="#9c9483" />
        {/* the doner turning */}
        <rect x="-50" y="160" width="10" height="28" rx="4" fill="#9a5a2a" />
        <rect className="doner" x="-50" y="160" width="10" height="28" rx="4" fill="#c27a3a" opacity="0.6" />
        <rect x="-24" y="160" width="46" height="14" fill="#17141c" />
        <text x="-1" y="166" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="4.6" fill="#e9b52a">
          KEBABS
        </text>
        <text x="-1" y="172" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="3.2" fill="#efe8da">
          CHIPS · OPEN LATE
        </text>
        <text x="-6" y="136" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="8" fill="#b3243a">
          DALSTON GRILL
        </text>
      </g>
      <Goer x={6} y={232} s={0.62} look={KEBAB_MAN} rim="#fff1c8" dark={0.05} index={index} gossip={speaks} />
      {/* counter and lower body in front of him */}
      <rect x="-62" y="186" width="94" height="7" fill="#c9c3cf" />
      <path d="M-70,193 L72,193 L72,212 L-70,212 Z" fill="#e8e4dc" />
      <rect x="-70" y="200" width="142" height="3" fill="#b3243a" />
      <circle cx="-44" cy="212" r="10" fill="#0b0810" />
      <circle cx="-44" cy="212" r="4" fill="#6e6875" />
      <circle cx="48" cy="212" r="10" fill="#0b0810" />
      <circle cx="48" cy="212" r="4" fill="#6e6875" />
      <g fill="#efe8da">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="smoke" cx={-46 + i * 4} cy="150" r={3 + i} opacity="0" />
        ))}
      </g>
      <LearnBadge x={66} y={192} show={gossip} />
    </g>
  );
}

export function RoseSeller({ x, rim, gossip, index }: { x: number; rim: string; gossip: boolean; index: number }) {
  return (
    <g className="wander">
      <Goer x={x} y={230} s={0.84} look={ROSES} rim={rim} dark={0.2} index={index} gossip={gossip} />
      <g transform={`translate(${x} 230) scale(0.84)`} pointerEvents="none">
        {[-2, 2, 6, 10].map((dx, i) => (
          <g key={dx}>
            <line x1={dx} y1="-62" x2={dx + 2} y2={-82 - (i % 2) * 4} stroke="#2c6e49" strokeWidth="1.2" />
            <circle cx={dx + 2} cy={-84 - (i % 2) * 4} r="2.6" fill="#d8304a" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** A black cab at the kerb, its TAXI light on. */
export function BlackCab({ x, rim, gossip, speaks, index }: { x: number; rim: string; gossip: boolean; speaks: boolean; index: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="0" cy="256" rx="80" ry="5" fill="#000" opacity="0.6" />
      <path d="M-74,236 L-200,214 L-200,262 Z" fill="#fff6d8" opacity="0.08" />
      <g data-learn="vehicle" style={gossip ? { cursor: "pointer" } : undefined}>
        <path d="M-58,214 Q-56,190 -36,188 L40,188 Q56,190 60,214 Z" fill="#14121a" />
        <path d="M-52,214 Q-50,196 -34,195 L-4,195 L-4,214 Z M2,195 L36,195 Q50,197 54,214 L2,214 Z" fill="#232a36" />
        <path d="M-52,214 Q-50,196 -34,195" stroke={rim} strokeOpacity="0.45" strokeWidth="0.8" fill="none" />
        <path d="M-80,238 Q-80,216 -58,214 L62,214 Q80,216 80,238 L80,248 L-80,248 Z" fill="#17151d" />
        <path d="M-80,230 Q-60,218 0,218 Q60,218 80,230" stroke={rim} strokeOpacity="0.35" strokeWidth="1" fill="none" />
        <rect className="taxi-light" x="-12" y="181" width="24" height="8" rx="2" fill="#ffb21a" />
        <text x="0" y="187.5" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5.5" fill="#17141c">
          TAXI
        </text>
        <rect x="-80" y="231" width="8" height="6" rx="3" fill="#fff6d8" />
        <rect x="76" y="231" width="4" height="6" rx="1" fill="#ff3a4a" />
        <circle cx="-48" cy="249" r="11" fill="#0b0810" />
        <circle cx="-48" cy="249" r="4.5" fill="#9c9483" />
        <circle cx="48" cy="249" r="11" fill="#0b0810" />
        <circle cx="48" cy="249" r="4.5" fill="#9c9483" />
      </g>
      <LearnBadge x={40} y={226} show={gossip} />
      <g data-person={index} style={speaks ? { cursor: "pointer" } : undefined}>
        <circle cx="-20" cy="203" r="6.5" fill="#c99a72" />
        <path d="M-26,199 Q-20,192 -14,199 Z" fill="#2a2234" />
        <path d="M-27,214 Q-27,209 -20,208 Q-13,209 -13,214 Z" fill="#3b4a8f" />
        {speaks && <rect x="-44" y="190" width="34" height="26" fill="transparent" />}
        {speaks && (
          <g className="gossip-hint" transform="translate(-20 178)">
            <path d="M-8,-6 h16 a3,3 0 0 1 3,3 v6 a3,3 0 0 1 -3,3 h-9 l-4,4 v-4 h-3 a3,3 0 0 1 -3,-3 v-6 a3,3 0 0 1 3,-3 Z" fill="#efe8da" />
            <g fill="#17141c">
              <circle cx="-4" cy="0" r="1.3" />
              <circle cx="0" cy="0" r="1.3" />
              <circle cx="4" cy="0" r="1.3" />
            </g>
          </g>
        )}
      </g>
      <g fill="#9c9483">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="exhaust" cx="86" cy="246" r={2.5 + i} opacity="0" />
        ))}
      </g>
    </g>
  );
}

/** The night bus: red double-decker, upstairs lit, crossing the front of the scene. */
export function NightBus() {
  return (
    <g id="okada" className="passer" data-learn="passer" data-sound="bus" transform="translate(-600 0)">
      <path d="M-100,246 L-220,226 L-220,262 Z" fill="#fff6d8" opacity="0.12" />
      <rect x="-100" y="150" width="200" height="104" rx="8" fill="#c8202f" />
      <rect x="-94" y="158" width="188" height="30" rx="3" fill="#2a1a20" />
      <rect x="-94" y="200" width="150" height="30" rx="3" fill="#2a1a20" />
      <rect x="-94" y="158" width="188" height="30" rx="3" fill="#ffe8b0" opacity="0.35" />
      <rect x="-94" y="200" width="150" height="30" rx="3" fill="#ffe8b0" opacity="0.3" />
      <g fill="#1a0f14">
        {[-80, -56, -30, -4, 22, 50, 76].map((hx) => (
          <circle key={hx} cx={hx} cy="176" r="5" />
        ))}
        {[-70, -40, -12, 20].map((hx) => (
          <circle key={hx} cx={hx} cy="218" r="5" />
        ))}
      </g>
      <rect x="62" y="200" width="30" height="46" rx="2" fill="#2a1a20" />
      <rect x="-90" y="152" width="34" height="5" rx="1" fill="#17141c" />
      <text x="-73" y="156.4" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="4.2" fill="#ffb21a">
        N29
      </text>
      <rect x="-100" y="190" width="200" height="6" fill="#a01825" />
      <rect x="-100" y="236" width="8" height="6" rx="2" fill="#fff6d8" />
      <circle cx="-62" cy="254" r="12" fill="#0b0810" />
      <circle cx="-62" cy="254" r="5" fill="#6e6875" />
      <circle cx="62" cy="254" r="12" fill="#0b0810" />
      <circle cx="62" cy="254" r="5" fill="#6e6875" />
    </g>
  );
}

/** London weather. */
export function Rain() {
  return (
    <g pointerEvents="none" stroke="#cfd8ff" strokeOpacity="0.35" strokeWidth="0.8">
      {Array.from({ length: 70 }, (_, i) => {
        const x = -320 + ((i * 53) % 1000);
        const y = -100 + ((i * 97) % 340);
        return <line key={i} className="rain" x1={x} y1={y} x2={x - 3} y2={y + 12} />;
      })}
    </g>
  );
}
