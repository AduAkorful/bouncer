import { Goer, type GoerLook } from "@/components/Goer";
import { LearnBadge } from "@/components/Street";

/**
 * The extra street pieces a sponsor can pick. Each keeps the hooks of the piece it stands in for:
 * `data-learn` for the "did you know" card, the vendor or driver's speaker index, and the passer's
 * `data-part="okada"` crossing, so the play screen treats them the same as the originals.
 */

type Speaker = { x: number; rim: string; gossip: boolean; speaks: boolean; index: number };

const COOK: GoerLook = { skin: "#6b4430", top: "#efe8da", bottom: "#1d1727", hair: "cap", hairColor: "#b3243a", accent: "#b3243a", outfit: "apron", pose: "still" };

/** One cart, dressed per stall: canopy, sign, and what is cooking on top. */
const CARTS = {
  corn: { canopy: "#2c6e49", sign: "CORN", sub: "ROASTED · COCONUT", body: "#5a3a22", glow: "#ff7a3a" },
  coffee: { canopy: "#3a2a22", sign: "COFFEE", sub: "ESPRESSO · TEA", body: "#2a2234", glow: "#ffd27a" },
  icecream: { canopy: "#e9a0b8", sign: "ICE CREAM", sub: "COLD · SWEET", body: "#efe8da", glow: "#9fc4dc" },
  noodles: { canopy: "#b3243a", sign: "NOODLES", sub: "BROTH · DUMPLINGS", body: "#3a1f1a", glow: "#ffb347" },
  tacos: { canopy: "#e9b52a", sign: "TACOS", sub: "AL PASTOR · SALSA", body: "#1f3a4a", glow: "#ff7a3a" },
} as const;

export type CartKind = keyof typeof CARTS;

export function CartStall({ kind, x, rim, gossip, speaks, index }: Speaker & { kind: CartKind }) {
  const cart = CARTS[kind];
  const ink = kind === "icecream" ? "#17141c" : "#efe8da";
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="0" cy="225" rx="64" ry="7" fill={cart.glow} opacity="0.14" />
      <Goer x={4} y={206} s={0.8} look={COOK} rim={rim} dark={0.15} index={index} gossip={speaks} />
      <g data-learn="food" style={gossip ? { cursor: "pointer" } : undefined}>
        {/* Canopy on two poles */}
        <rect x="-38" y="120" width="2.5" height="54" fill="#0d0a12" />
        <rect x="35.5" y="120" width="2.5" height="54" fill="#0d0a12" />
        <path d="M-46,124 L46,124 L40,110 L-40,110 Z" fill={cart.canopy} />
        {[-36, -18, 0, 18, 36].map((cx) => <path key={cx} d={`M${cx - 9},124 q9,8 18,0`} fill={cart.canopy} opacity="0.85" />)}
        <rect x="-40" y="172" width="80" height="34" rx="2" fill={cart.body} />
        <rect x="-30" y="179" width="60" height="18" rx="1" fill="#0b0810" opacity="0.35" />
        <text x="0" y="191" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize={cart.sign.length > 7 ? 7.5 : 10} fill={ink}>{cart.sign}</text>
        <text x="0" y="202" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="3.8" fill={ink} opacity="0.85">{cart.sub}</text>
        <CartTop kind={kind} glow={cart.glow} />
        {kind === "icecream" ? (
          <>
            <circle cx="-30" cy="212" r="10" fill="none" stroke="#0d0a12" strokeWidth="3" />
            <circle cx="30" cy="212" r="10" fill="none" stroke="#0d0a12" strokeWidth="3" />
          </>
        ) : (
          <>
            <circle cx="-26" cy="212" r="9" fill="#0d0a12" />
            <circle cx="26" cy="212" r="9" fill="#0d0a12" />
          </>
        )}
      </g>
      <LearnBadge x={34} y={184} show={gossip} />
    </g>
  );
}

function CartTop({ kind, glow }: { kind: CartKind; glow: string }) {
  if (kind === "corn") {
    return (
      <g>
        <rect x="-34" y="166" width="68" height="6" fill="#17121f" />
        <rect className="coals" x="-30" y="167" width="60" height="3" fill={glow} />
        {[-22, -10, 2, 14].map((cx) => <rect key={cx} x={cx} y="160" width="9" height="6" rx="3" fill="#e9b52a" stroke="#7a5a20" strokeWidth="0.6" />)}
        {[0, 1, 2].map((i) => <circle key={i} className="smoke" cx={-6 + i * 6} cy="156" r={3 + i} fill="#9c9483" opacity="0" />)}
      </g>
    );
  }
  if (kind === "coffee") {
    return (
      <g>
        <rect x="-20" y="150" width="30" height="22" rx="2" fill="#9c9483" />
        <rect x="-16" y="156" width="22" height="6" fill="#3a3145" />
        <rect x="16" y="162" width="8" height="10" rx="1" fill="#efe8da" />
        {[0, 1].map((i) => <circle key={i} className="smoke" cx={20 + i * 2} cy="156" r={2 + i} fill="#efe8da" opacity="0" />)}
      </g>
    );
  }
  if (kind === "icecream") {
    return (
      <g>
        <rect x="-30" y="160" width="60" height="12" rx="3" fill="#9fc4dc" />
        {[-18, 0, 18].map((cx, i) => (
          <g key={cx}>
            <path d={`M${cx - 4},156 L${cx},166 L${cx + 4},156 Z`} fill="#cfa349" />
            <circle cx={cx} cy="154" r="4.5" fill={["#e9a0b8", "#efe8da", "#7a4a2a"][i]} />
          </g>
        ))}
      </g>
    );
  }
  if (kind === "noodles") {
    return (
      <g>
        <rect x="-26" y="152" width="34" height="20" rx="3" fill="#6e6875" />
        <rect x="-28" y="150" width="38" height="4" rx="2" fill="#9c9483" />
        <rect x="14" y="164" width="16" height="8" rx="3" fill="#efe8da" />
        {[0, 1, 2].map((i) => <circle key={i} className="smoke" cx={-14 + i * 6} cy="146" r={3 + i} fill="#efe8da" opacity="0" />)}
      </g>
    );
  }
  return (
    <g>
      {/* The spit, with a pineapple on top */}
      <rect x="-24" y="146" width="12" height="26" rx="4" fill="#b35a2a" />
      <rect className="doner" x="-24" y="146" width="12" height="26" rx="4" fill="#e07a2a" opacity="0.6" />
      <path d="M-22,146 l4,-8 l4,8 Z" fill="#e9b52a" />
      <path d="M-20,138 l2,-6 l2,6" stroke="#2c6e49" strokeWidth="1.5" fill="none" />
      {[4, 14, 24].map((cx) => <path key={cx} d={`M${cx - 5},170 q5,-8 10,0 Z`} fill="#efe8da" />)}
    </g>
  );
}

const DRIVER: GoerLook = { skin: "#3b2417", top: "#efe8da", bottom: "#17141c", hair: "low", hairColor: "#1c120c", outfit: "shirt", pose: "fold" };

export type RideKind = "tuktuk" | "limo" | "classic" | "scooters";

/** Parked rides. The driver stands beside it, so the speaker is the same person whatever is parked. */
export function Ride({ kind, x, rim, gossip, speaks, index }: Speaker & { kind: RideKind }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="0" cy="256" rx="84" ry="5" fill="#000" opacity="0.55" />
      <g data-learn="vehicle" style={gossip ? { cursor: "pointer" } : undefined}>
        <RideBody kind={kind} rim={rim} />
      </g>
      <Goer x={kind === "limo" ? -96 : -70} y={250} s={0.72} look={kind === "limo" ? { ...DRIVER, top: "#17141c", accent: "#efe8da", outfit: "jacket", pose: "still" } : DRIVER} rim={rim} dark={0.25} index={index} gossip={speaks} />
      <LearnBadge x={40} y={228} show={gossip} />
    </g>
  );
}

function RideBody({ kind, rim }: { kind: RideKind; rim: string }) {
  if (kind === "tuktuk") {
    return (
      <g>
        <path d="M-40,248 L-40,200 Q-40,186 -26,184 L30,184 Q44,186 44,202 L44,248 Z" fill="#2c6e49" />
        <path d="M-40,196 h84" stroke="#e9b52a" strokeWidth="3" />
        <path d="M-34,202 h30 v24 h-30 Z" fill="#141a26" />
        <path d="M44,214 L62,232 L62,248 L44,248 Z" fill="#2c6e49" />
        <circle cx="-24" cy="250" r="9" fill="#0b0810" />
        <circle cx="30" cy="250" r="9" fill="#0b0810" />
        <circle cx="58" cy="252" r="7" fill="#0b0810" />
        <rect x="58" y="234" width="6" height="4" rx="1" fill="#fff6d8" />
      </g>
    );
  }
  if (kind === "limo") {
    return (
      <g>
        <path d="M-110,214 Q-100,198 -80,196 L80,196 Q100,198 108,214 Z" fill="#efe8da" />
        <path d="M-102,214 Q-94,203 -80,202 L80,202 Q94,203 100,214 Z" fill="#232a36" />
        {[-70, -34, 2, 38].map((wx) => <rect key={wx} x={wx} y="202" width="2" height="12" fill="#efe8da" />)}
        <path d="M-120,236 Q-120,216 -100,214 L104,214 Q122,216 122,236 L122,246 L-120,246 Z" fill="#e8e4dc" />
        <path d="M-120,236 h242" stroke={rim} strokeOpacity="0.3" />
        <circle cx="-86" cy="248" r="10" fill="#0b0810" />
        <circle cx="88" cy="248" r="10" fill="#0b0810" />
      </g>
    );
  }
  if (kind === "classic") {
    return (
      <g>
        <path d="M-50,214 Q-44,192 -20,190 L26,190 Q46,192 52,214 Z" fill="#7a1f2a" />
        <path d="M-42,214 Q-36,198 -18,197 L24,197 Q40,198 44,214 Z" fill="#141a26" />
        <path d="M-84,240 Q-84,218 -60,214 L64,214 Q86,218 86,240 L86,248 L-84,248 Z" fill="#b3243a" />
        <path d="M-84,240 h170" stroke="#efe8da" strokeWidth="2" opacity="0.7" />
        <circle cx="-80" cy="232" r="4" fill="#fff6d8" />
        <circle cx="-52" cy="249" r="11" fill="#0b0810" />
        <circle cx="-52" cy="249" r="6" fill="#efe8da" opacity="0.7" />
        <circle cx="54" cy="249" r="11" fill="#0b0810" />
        <circle cx="54" cy="249" r="6" fill="#efe8da" opacity="0.7" />
      </g>
    );
  }
  return (
    <g>
      {[-40, 0, 40].map((sx, i) => (
        <g key={sx} transform={`translate(${sx} 0)`}>
          <path d="M-16,248 Q-14,232 0,230 L14,230 L18,248 Z" fill={["#9fc4dc", "#e9b52a", "#b3243a"][i]} />
          <path d="M12,230 L16,212 M10,212 h12" stroke="#3a3145" strokeWidth="2.5" />
          <circle cx="-12" cy="250" r="6" fill="#0b0810" />
          <circle cx="16" cy="250" r="6" fill="#0b0810" />
        </g>
      ))}
    </g>
  );
}

export type PasserKind = "bike" | "tram" | "skater";

/** Something that crosses the front of the scene now and then, on the same track as the okada. */
export function Passer({ kind }: { kind: PasserKind }) {
  const sound = kind === "tram" ? "bus" : "none";
  return (
    <g data-part="okada" className="passer" data-learn="passer" data-sound={sound} transform="translate(-600 0)">
      {kind === "bike" ? (
        <g>
          <path d="M-30,250 L-140,238 L-140,262 Z" fill="#fff6d8" opacity="0.12" />
          <circle cx="-20" cy="252" r="10" fill="none" stroke="#3a3145" strokeWidth="2" />
          <circle cx="20" cy="252" r="10" fill="none" stroke="#3a3145" strokeWidth="2" />
          <path d="M-20,252 L-4,236 L14,236 L20,252 M-4,236 L-8,228 M14,236 L12,228" stroke="#e9b52a" strokeWidth="2.5" fill="none" />
          <path d="M2,234 L6,212" stroke="#3b4a8f" strokeWidth="7" strokeLinecap="round" />
          <circle cx="7" cy="204" r="6" fill="#6b4430" />
          <rect x="12" y="210" width="12" height="10" rx="1" fill="#2c6e49" />
        </g>
      ) : kind === "tram" ? (
        <g>
          <rect x="-110" y="176" width="220" height="70" rx="8" fill="#b3243a" />
          <rect x="-110" y="200" width="220" height="4" fill="#efe8da" />
          {[-96, -60, -24, 12, 48, 84].map((wx) => <rect key={wx} x={wx} y="182" width="26" height="16" rx="2" fill="#fff1c8" opacity="0.7" />)}
          <path d="M0,176 L-10,150 M0,176 L10,150 M-16,150 h32" stroke="#3a3145" strokeWidth="1.5" />
          {[-80, -50, 50, 80].map((cx) => <circle key={cx} cx={cx} cy="248" r="6" fill="#0b0810" />)}
        </g>
      ) : (
        <g>
          <rect x="-16" y="248" width="32" height="3" rx="1.5" fill="#e9b52a" />
          <circle cx="-10" cy="253" r="2.5" fill="#efe8da" />
          <circle cx="10" cy="253" r="2.5" fill="#efe8da" />
          <path d="M-4,248 L0,232 L6,248 M0,232 L2,212" stroke="#17141c" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M2,218 L-12,212 M2,218 L16,210" stroke="#b3243a" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M2,212 L2,200" stroke="#b3243a" strokeWidth="8" strokeLinecap="round" />
          <circle cx="2" cy="194" r="6" fill="#a8754f" />
        </g>
      )}
    </g>
  );
}

export type SellerKind = "glow" | "balloons" | "snacks" | "chargers";

const SELLER_LOOKS: Record<SellerKind, GoerLook> = {
  glow: { skin: "#4a2e1f", top: "#2a2234", bottom: "#1d1727", hair: "cap", hairColor: "#17141c", accent: "#7ef0a8", outfit: "hoodie", pose: "hold" },
  balloons: { skin: "#c99a72", top: "#e9b52a", bottom: "#1d1727", hair: "bun", hairColor: "#2a1a10", outfit: "tee", pose: "hold" },
  snacks: { skin: "#6b4430", top: "#2c6e49", bottom: "#1d1727", hair: "headwrap", hairColor: "#1c120c", accent: "#e9b52a", outfit: "dress", pose: "basin" },
  chargers: { skin: "#3b2417", top: "#1f3a4a", bottom: "#17141c", hair: "low", hairColor: "#1c120c", outfit: "jacket", pose: "hold", accent: "#efe8da" },
};

/** A seller working the queue, with what they sell held up. */
export function Seller({ kind, x, rim, gossip, index }: { kind: SellerKind; x: number; rim: string; gossip: boolean; index: number }) {
  return (
    <g className="wander">
      <Goer x={x} y={230} s={0.84} look={SELLER_LOOKS[kind]} rim={rim} dark={0.2} index={index} gossip={gossip} />
      <g transform={`translate(${x} 230) scale(0.84)`} pointerEvents="none">
        {kind === "glow" ? (
          [-4, 1, 6, 11].map((dx, i) => <rect key={dx} x={dx} y={-92 - (i % 2) * 4} width="2" height="22" rx="1" fill={["#7ef0a8", "#ff9aab", "#9fc4dc", "#e9b52a"][i]} />)
        ) : kind === "balloons" ? (
          [-10, 2, 14].map((dx, i) => (
            <g key={dx}>
              <path d={`M6,-64 L${dx},${-110 - i * 6}`} stroke="#efe8da" strokeWidth="0.5" />
              <ellipse cx={dx} cy={-116 - i * 6} rx="8" ry="10" fill={["#b3243a", "#8f6bff", "#2c6e49"][i]} />
            </g>
          ))
        ) : kind === "snacks" ? (
          <g>
            <ellipse cx="0" cy="-100" rx="16" ry="4" fill="#cfa349" />
            {[-10, -4, 2, 8].map((dx) => <rect key={dx} x={dx} y="-108" width="5" height="8" rx="1" fill="#e9b52a" />)}
          </g>
        ) : (
          <g>
            {[-2, 4, 10].map((dx, i) => <path key={dx} d={`M${dx},-64 q2,10 -2,20`} stroke={["#efe8da", "#17141c", "#e9b52a"][i]} strokeWidth="1.2" fill="none" />)}
            <rect x="0" y="-70" width="10" height="6" rx="1" fill="#efe8da" />
          </g>
        )}
      </g>
    </g>
  );
}

/** Weather beyond rain. Each sits in front of the street and lets clicks through. */
export function Sky({ kind }: { kind: "fog" | "snow" | "fireworks" | "stars" }) {
  if (kind === "fog") {
    return (
      <g pointerEvents="none">
        {/* Soft-edged bands thick enough to read as fog at a glance; at 7% they went unseen (QA r25 R25-15). */}
        <defs>
          <linearGradient id="fog-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfd6e0" stopOpacity="0" />
            <stop offset="0.5" stopColor="#cfd6e0" stopOpacity="1" />
            <stop offset="1" stopColor="#cfd6e0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 75, 120].map((y, i) => <rect key={y} className="fog" x="-1000" y={y} width="2400" height="70" fill="url(#fog-band)" opacity={0.16 + i * 0.06} />)}
      </g>
    );
  }
  if (kind === "snow") {
    return (
      <g pointerEvents="none" fill="#efe8da">
        {Array.from({ length: 70 }, (_, i) => <circle key={i} className="snow" cx={-230 + ((i * 131) % 900)} cy={-40 + ((i * 47) % 280)} r={0.8 + (i % 3) * 0.5} opacity="0.75" />)}
        <rect x="-1000" y="218" width="2400" height="5" fill="#efe8da" opacity="0.5" />
      </g>
    );
  }
  if (kind === "fireworks") {
    return (
      <g pointerEvents="none">
        {[
          [-120, -10, "#ff9aab"],
          [330, -30, "#e9b52a"],
          [540, 0, "#7ef0a8"],
        ].map(([cx, cy, color]) => (
          <g key={`${cx}`} className="firework" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1={cx as number} y1={cy as number} x2={(cx as number) + Math.cos(a) * 22} y2={(cy as number) + Math.sin(a) * 22} stroke={color as string} strokeWidth="1.4" strokeLinecap="round" />;
            })}
            <circle cx={cx as number} cy={cy as number} r="3" fill="#fff1c8" />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g pointerEvents="none" fill="#fff1c8">
      {Array.from({ length: 40 }, (_, i) => <circle key={i} className="star" cx={-230 + ((i * 113) % 900)} cy={-40 + ((i * 29) % 90)} r={0.5 + (i % 3) * 0.4} opacity={0.4 + (i % 4) * 0.15} />)}
    </g>
  );
}
