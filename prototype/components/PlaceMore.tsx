import { Goer } from "@/components/Goer";
import type { Place } from "@/lib/street-setting";

/**
 * Garden party, warehouse, harbour front and hotel lounge. Each has the same parts as the places in
 * PlaceBackdrop: the wall behind the door, the ground, what stands right of the door, the light, and a
 * speaker in the taxi's slot. The door, the sign, the bouncer and the queue never move.
 */

export function MoreBack({ place, p }: { place: Place; p: string }) {
  if (place === "garden") {
    return (
      <g>
        <defs>
          <linearGradient id={`${p}-gardenSky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a1020" />
            <stop offset="1" stopColor="#1b2a2a" />
          </linearGradient>
        </defs>
        <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-gardenSky)`} />
        {/* A hedge wall, and trees behind it */}
        {[-220, -120, 330, 430, 540].map((x, i) => (
          <g key={x}>
            <rect x={x + 18} y={40 + (i % 2) * 10} width="6" height="80" fill="#1b1410" />
            <circle cx={x + 21} cy={30 + (i % 2) * 10} r="34" fill="#0f2a1c" />
            <circle cx={x + 4} cy={46 + (i % 2) * 10} r="22" fill="#12301f" />
          </g>
        ))}
        <rect x="-1000" y="120" width="2400" height="102" fill="#10291b" />
        <path d="M-1000,120 H1400" stroke="#1d4a30" strokeWidth="3" />
        {/* The pavilion around the door */}
        <rect x="104" y="8" width="192" height="214" fill="#efe8da" opacity="0.08" />
        <path d="M92,10 L200,-30 L308,10 Z" fill="#efe8da" opacity="0.85" />
        <path d="M92,10 L200,-30 L308,10" fill="none" stroke="#cfa349" strokeWidth="1.2" />
        <circle cx="330" cy="-50" r="9" fill="#f4ecd0" opacity="0.8" />
      </g>
    );
  }
  if (place === "warehouse") {
    return (
      <g>
        <defs>
          <pattern id={`${p}-metal`} width="12" height="40" patternUnits="userSpaceOnUse">
            <rect width="12" height="40" fill="#1a1c22" />
            <rect x="0" width="2" height="40" fill="#24272f" />
          </pattern>
        </defs>
        {/* Corrugated metal, a roll-up door, and a skylight strip */}
        <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-metal)`} />
        <rect x="-1000" y="-1000" width="2400" height="940" fill="#0b0c10" />
        <rect x="-1000" y="-64" width="2400" height="6" fill="#3a3f4a" />
        {[-200, -80, 330].map((x) => (
          <g key={x}>
            <rect x={x} y="-40" width="60" height="16" fill="#1f3a4a" opacity="0.7" />
            <path d={`M${x},-32 H${x + 60} M${x + 20},-40 V-24 M${x + 40},-40 V-24`} stroke="#0b0c10" />
          </g>
        ))}
        <text x="210" y="-4" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="9" fill="#e9b52a" opacity="0.55">UNIT 7</text>
        <path d="M80,-12 l10,0 M310,-12 l10,0" stroke="#e9b52a" strokeWidth="3" opacity="0.5" />
      </g>
    );
  }
  if (place === "harbour") {
    return (
      <g>
        <defs>
          <linearGradient id={`${p}-harbourSky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#081020" />
            <stop offset="1" stopColor="#1a2440" />
          </linearGradient>
        </defs>
        <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-harbourSky)`} />
        {/* Cranes over the water, and a lit ship far out */}
        {[-200, 470].map((x) => (
          <g key={x} stroke="#2c3242" strokeWidth="3" fill="none">
            <path d={`M${x},150 V-40 H${x + 90} M${x},-20 L${x + 60},-40 M${x + 70},-40 V20`} />
            <circle cx={x + 70} cy="24" r="2" fill="#ff3a4a" stroke="none" />
          </g>
        ))}
        <rect x="-1000" y="150" width="2400" height="72" fill="#0c2236" />
        <path d="M-1000,168 H1400 M-1000,190 H1400" stroke="#3d7fa0" strokeWidth="0.8" opacity="0.4" />
        <g transform="translate(-60 140)">
          <rect x="0" y="0" width="80" height="10" fill="#1b1f2a" />
          {[6, 18, 30, 42, 54, 66].map((x) => <rect key={x} x={x} y="2" width="4" height="3" fill="#ffd27a" opacity="0.7" />)}
        </g>
        {/* The bar is a converted shipping container round the door */}
        <rect x="104" y="0" width="192" height="222" fill="#7a2a1f" />
        {Array.from({ length: 16 }, (_, i) => <rect key={i} x={106 + i * 12} y="0" width="3" height="222" fill="#5a1f17" />)}
        <rect x="104" y="0" width="192" height="6" fill="#4a1a12" />
      </g>
    );
  }
  if (place === "lounge") {
    return (
      <g>
        <defs>
          <pattern id={`${p}-panel`} width="40" height="60" patternUnits="userSpaceOnUse">
            <rect width="40" height="60" fill="#1c1418" />
            <rect x="4" y="4" width="32" height="52" fill="none" stroke="#2c2026" strokeWidth="1.5" />
          </pattern>
        </defs>
        {/* Wood panels, a marble floor line, and chandeliers */}
        <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-panel)`} />
        <rect x="-1000" y="-1000" width="2400" height="980" fill="#0e0a0c" />
        <rect x="-1000" y="-22" width="2400" height="6" fill="#cfa349" opacity="0.5" />
        {[-120, 520].map((x) => (
          <g key={x}>
            <path d={`M${x},-16 V6`} stroke="#cfa349" strokeWidth="1" />
            <path d={`M${x - 20},14 Q${x},30 ${x + 20},14 Z`} fill="#cfa349" opacity="0.6" />
            {[-16, -8, 0, 8, 16].map((dx) => <circle key={dx} cx={x + dx} cy={18 + Math.abs(dx) / 3} r="2" fill="#fff1c8" />)}
            <circle cx={x} cy="18" r="40" fill="#ffe2a0" opacity="0.06" />
          </g>
        ))}
      </g>
    );
  }
  return null;
}

export function MoreFront({ place }: { place: Place }) {
  if (place === "garden") {
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#13301e" />
        {Array.from({ length: 50 }, (_, i) => <path key={i} d={`M${-220 + ((i * 53) % 880)},${232 + ((i * 29) % 28)} l2,-5 l2,5`} stroke="#1f4a2e" fill="none" />)}
        <path d="M120,222 L280,222 L300,262 L100,262 Z" fill="#5a4a3a" opacity="0.7" />
      </g>
    );
  }
  if (place === "warehouse") {
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#16171b" />
        <path d="M-1000,240 H1400" stroke="#e9b52a" strokeWidth="3" strokeDasharray="14 10" opacity="0.6" />
        {[-60, 300].map((x) => <rect key={x} x={x} y="226" width="40" height="8" fill="#5a3b24" />)}
      </g>
    );
  }
  if (place === "harbour") {
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#2a2420" />
        {Array.from({ length: 60 }, (_, i) => <line key={i} x1={-1000 + i * 40} x2={-1000 + i * 40} y1="222" y2="262" stroke="#1a1612" />)}
        {[-140, 360].map((x) => (
          <g key={x}>
            <rect x={x} y="214" width="10" height="12" rx="2" fill="#0b0810" />
            <path d={`M${x + 5},218 q30,10 60,4`} stroke="#8a7a5a" strokeWidth="1.5" fill="none" />
          </g>
        ))}
      </g>
    );
  }
  if (place === "lounge") {
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#211a1c" />
        <path d="M-1000,230 L1400,236 M-1000,246 L1400,240" stroke="#3a2c30" strokeWidth="1" />
        <rect x="110" y="222" width="180" height="40" fill="#7a1f2a" opacity="0.8" />
      </g>
    );
  }
  return null;
}

export function MoreSide({ place }: { place: Place }) {
  if (place === "garden") {
    return (
      <g>
        {/* Long tables under the trees, and a fountain */}
        <rect x="380" y="190" width="160" height="6" fill="#efe8da" opacity="0.85" />
        {[390, 530].map((x) => <rect key={x} x={x} y="196" width="4" height="26" fill="#3a3145" />)}
        {[410, 450, 490].map((x) => <rect key={x} x={x} y="180" width="5" height="10" rx="1" fill="#cfa349" opacity="0.8" />)}
        <g transform="translate(610 222)">
          <ellipse cx="0" cy="0" rx="36" ry="7" fill="#3a3f4a" />
          <rect x="-4" y="-40" width="8" height="40" fill="#3a3f4a" />
          <path d="M0,-40 q-14,10 -24,30 M0,-40 q14,10 24,30" stroke="#9fc4dc" strokeWidth="1.2" fill="none" opacity="0.7" />
        </g>
      </g>
    );
  }
  if (place === "warehouse") {
    return (
      <g>
        {/* The loading bay: a half-open roll-up door, pallets, a forklift */}
        <rect x="390" y="60" width="200" height="162" fill="#0b0c10" stroke="#3a3f4a" strokeWidth="3" />
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1="392" x2="588" y1={64 + i * 10} y2={64 + i * 10} stroke="#2a2d35" strokeWidth="2" />)}
        <rect x="392" y="146" width="196" height="76" fill="#8f6bff" opacity="0.18" />
        <g transform="translate(620 222)">
          <rect x="-24" y="-40" width="40" height="28" fill="#e9b52a" />
          <rect x="16" y="-60" width="4" height="60" fill="#3a3f4a" />
          <circle cx="-14" cy="-6" r="6" fill="#0b0810" />
          <circle cx="8" cy="-6" r="6" fill="#0b0810" />
        </g>
      </g>
    );
  }
  if (place === "harbour") {
    return (
      <g>
        {/* Stacked containers along the quay */}
        {[
          [380, 150, "#1f3a4a"],
          [470, 150, "#2c6e49"],
          [425, 108, "#b3243a"],
          [560, 150, "#cfa349"],
        ].map(([x, y, fill]) => (
          <g key={`${x}-${y}`}>
            <rect x={x as number} y={y as number} width="86" height="40" fill={fill as string} opacity="0.75" />
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={(x as number) + 4 + i * 10} y={(y as number) + 2} width="2" height="36" fill="#000" opacity="0.25" />)}
          </g>
        ))}
        <rect x="372" y="190" width="300" height="32" fill="#0c2236" />
      </g>
    );
  }
  if (place === "lounge") {
    return (
      <g>
        {/* Armchairs and a grand piano across the lobby */}
        {[400, 470].map((x) => (
          <g key={x} transform={`translate(${x} 222)`}>
            <rect x="-16" y="-26" width="32" height="14" rx="4" fill="#7a1f2a" />
            <rect x="-18" y="-40" width="36" height="16" rx="5" fill="#8a2a34" />
            <rect x="-14" y="-12" width="3" height="12" fill="#3a2a22" />
            <rect x="11" y="-12" width="3" height="12" fill="#3a2a22" />
          </g>
        ))}
        <g transform="translate(600 222)">
          <path d="M-40,-40 h60 q30,0 30,20 h-90 Z" fill="#0b0810" />
          <rect x="-40" y="-26" width="16" height="6" fill="#efe8da" />
          {[-34, 14, 44].map((x) => <rect key={x} x={x} y="-20" width="3" height="20" fill="#0b0810" />)}
        </g>
      </g>
    );
  }
  return null;
}

export function MoreLight({ place }: { place: Place }) {
  if (place === "garden") {
    return (
      <g>
        <path d="M262,40 Q300,70 352,30 Q420,60 470,30" stroke="#3a3145" strokeWidth="0.8" fill="none" />
        {Array.from({ length: 12 }, (_, i) => {
          const x = 262 + i * 18;
          const y = 40 + Math.sin(i * 0.9) * 10 + 10;
          return <circle key={i} cx={x} cy={y} r="2.6" fill={["#ffd27a", "#ff9aab", "#9fc4dc"][i % 3]} opacity="0.9" />;
        })}
      </g>
    );
  }
  if (place === "warehouse") {
    return (
      <g>
        {[300, 345].map((x) => (
          <g key={x}>
            <path d={`M${x},-58 V20`} stroke="#3a3f4a" strokeWidth="1" />
            <path d={`M${x - 10},20 h20 l-4,8 h-12 Z`} fill="#3a3f4a" />
            <path d={`M${x - 8},28 L${x - 30},222 L${x + 30},222 L${x + 8},28 Z`} fill="#fff1c8" opacity="0.05" />
          </g>
        ))}
      </g>
    );
  }
  if (place === "harbour") {
    return (
      <g>
        <rect x="350" y="60" width="4" height="162" fill="#2c3242" />
        <rect x="340" y="54" width="24" height="8" fill="#2c3242" />
        <path d="M342,62 L310,222 L394,222 L362,62 Z" fill="#ffe2a0" opacity="0.07" />
      </g>
    );
  }
  if (place === "lounge") {
    return (
      <g>
        {[300, 350].map((x) => (
          <g key={x} transform={`translate(${x} 222)`}>
            <rect x="-2" y="-60" width="4" height="60" fill="#cfa349" />
            <path d="M-12,-60 h24 l-6,-16 h-12 Z" fill="#efe8da" opacity="0.85" />
            <circle cx="0" cy="-66" r="20" fill="#ffe2a0" opacity="0.08" />
          </g>
        ))}
      </g>
    );
  }
  return null;
}

/** The speaker who stands where a street has its taxi. */
export function MoreRide({ place, rim, speaks, index }: { place: Place; rim: string; speaks: boolean; index: number }) {
  const who = {
    garden: { skin: "#c99a72", top: "#2c6e49", bottom: "#17141c", hair: "puff", hairColor: "#2a1a10", outfit: "dress", pose: "hold" },
    warehouse: { skin: "#4a2e1f", top: "#e07a2a", bottom: "#17141c", hair: "cap", hairColor: "#17141c", accent: "#efe8da", outfit: "jacket", pose: "fold" },
    harbour: { skin: "#6b4430", top: "#1f3a4a", bottom: "#17141c", hair: "cap", hairColor: "#17141c", accent: "#b3243a", outfit: "jacket", pose: "still" },
    lounge: { skin: "#a8754f", top: "#17141c", bottom: "#17141c", hair: "low", hairColor: "#1c120c", accent: "#cfa349", outfit: "shirt", pose: "hold" },
  } as const;
  const look = who[place as keyof typeof who];
  if (!look) return null;
  return (
    <g transform="translate(470 0)">
      <Goer x={0} y={222} s={0.74} look={look} rim={rim} dark={0.25} index={index} gossip={speaks} flip />
    </g>
  );
}

export const MORE_PLACES = new Set<Place>(["garden", "warehouse", "harbour", "lounge"]);

export const MORE_WALL: Partial<Record<Place, string>> = { garden: "GARDEN LIFE", warehouse: "LOUD INSIDE", harbour: "HIGH TIDE", lounge: "BY INVITATION" };
