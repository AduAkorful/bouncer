import type { Place } from "@/lib/street-setting";
import { Goer } from "@/components/Goer";
import { MORE_PLACES, MORE_WALL, MoreBack, MoreFront, MoreLight, MoreRide, MoreSide } from "@/components/PlaceMore";

/**
 * What kind of venue the door sits in. The street front is the plain brick wall; the others paint over it.
 * `PlaceBack` sits on the wall behind the sign and the door; `PlaceFront` sits on the ground in front of it.
 * The door, the sign, the bouncer, and the queue stay where they are, so play reads the same at every door.
 */
export function PlaceBack({ place, p }: { place: Place; p: string }) {
  if (MORE_PLACES.has(place)) return <MoreBack place={place} p={p} />;
  if (place === "beach") {
    return (
      <g>
        <defs>
          <linearGradient id={`${p}-beachSky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1430" />
            <stop offset="0.7" stopColor="#1d2350" />
            <stop offset="1" stopColor="#3a2650" />
          </linearGradient>
          <pattern id={`${p}-planks`} width="14" height="40" patternUnits="userSpaceOnUse">
            <rect width="14" height="40" fill="#2b1d16" />
            <rect x="0.6" width="12.8" height="40" fill="#33231a" />
            <path d="M0,0 V40" stroke="#1a110c" strokeWidth="1.2" />
          </pattern>
        </defs>
        {/* Night sky and sea where the brick was */}
        <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-beachSky)`} />
        <circle cx="330" cy="-40" r="11" fill="#f4ecd0" opacity="0.85" />
        <rect x="-1000" y="150" width="2400" height="72" fill="#0d2a3e" />
        <path d="M-1000,168 H1400 M-1000,188 H1400 M-1000,206 H1400" stroke="#2e6a86" strokeWidth="1" opacity="0.5" />
        {/* The bar is a wooden shack around the door */}
        <rect x="100" y="0" width="200" height="222" fill={`url(#${p}-planks)`} />
        <path d="M86,4 L200,-34 L314,4 Z" fill="#5a3b24" stroke="#2b1d16" strokeWidth="2" />
        <path d="M86,4 L200,-34 L314,4" fill="none" stroke="#c9a46a" strokeWidth="1" opacity="0.5" />
        {/* Palms either side */}
        {[-40, 404].map((x) => (
          <g key={x} transform={`translate(${x} 222)`}>
            <path d="M0,0 C4,-60 -6,-120 6,-170" stroke="#1b1410" strokeWidth="7" fill="none" />
            {[-60, -20, 20, 60, 100].map((angle) => (
              <path key={angle} d="M6,-170 q30,-10 54,12" stroke="#0f2a1c" strokeWidth="6" fill="none" transform={`rotate(${angle} 6 -170)`} />
            ))}
          </g>
        ))}
        {/* String lights across the front */}
        <path d="M60,8 Q200,40 340,8" fill="none" stroke="#3a3145" strokeWidth="0.8" />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i + 0.5) / 12;
          const x = 60 + t * 280;
          const y = 8 + 4 * 32 * t * (1 - t);
          return <circle key={i} cx={x} cy={y + 2} r="1.8" fill={i % 2 ? "#ffd27a" : "#ff9aab"} />;
        })}
      </g>
    );
  }
  if (place === "rooftop") {
    return (
      <g>
        <defs>
          <linearGradient id={`${p}-roofSky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#090713" />
            <stop offset="1" stopColor="#261a3d" />
          </linearGradient>
        </defs>
        {/* Open sky above the roofline, the city skyline behind */}
        <rect x="-1000" y="-1000" width="2400" height="1100" fill={`url(#${p}-roofSky)`} />
        {[
          [-260, 40, 70], [-180, 10, 50], [-120, 60, 40], [-60, 30, 60], [300, 20, 60], [370, 50, 46], [430, -10, 64], [510, 35, 52], [580, 5, 60],
        ].map(([x, top, w]) => (
          <g key={x}>
            <rect x={x} y={top} width={w} height={100 - top} fill="#120d1d" />
            {Array.from({ length: Math.floor((100 - top) / 14) }, (_, row) =>
              Array.from({ length: Math.floor(w / 12) }, (_, col) => (
                (row + col + x) % 3 === 0 ? <rect key={`${row}-${col}`} x={x + 4 + col * 12} y={top + 6 + row * 14} width="4" height="6" fill="#f0c27a" opacity="0.5" /> : null
              )),
            )}
          </g>
        ))}
        {/* The rooftop bar's own wall stops at the roofline */}
        <rect x="-1000" y="100" width="2400" height="122" fill="#1b1524" />
        <rect x="-1000" y="98" width="2400" height="4" fill="#2c2338" />
      </g>
    );
  }
  if (place === "basement") {
    return (
      <g>
        <defs>
          <pattern id={`${p}-block`} width="40" height="20" patternUnits="userSpaceOnUse">
            <rect width="40" height="20" fill="#16131a" />
            <path d="M0,0 H40 M0,0 V20 M20,10 V20 M0,10 H40" stroke="#0b090e" strokeWidth="1" />
          </pattern>
        </defs>
        {/* Concrete instead of brick, and the street a floor above */}
        <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-block)`} />
        <rect x="-1000" y="-1000" width="2400" height="990" fill="#0a080d" />
        <rect x="-1000" y="-12" width="2400" height="4" fill="#2c2338" />
        {/* Pipes along the low ceiling */}
        <rect x="-1000" y="0" width="2400" height="5" rx="2" fill="#3a3145" />
        <rect x="-1000" y="9" width="2400" height="3" rx="1.5" fill="#2a2234" />
        {[40, 130, 270, 360].map((x) => <rect key={x} x={x} y="-2" width="5" height="16" fill="#2a2234" />)}
        <text x="300" y="34" fontFamily="var(--font-jetbrains)" fontSize="7" fill="#efe8da" opacity="0.5">B1</text>
      </g>
    );
  }
  return null;
}

export function PlaceFront({ place }: { place: Place }) {
  if (MORE_PLACES.has(place)) return <MoreFront place={place} />;
  if (place === "beach") {
    // Sand instead of wet pavement
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#3a2c22" />
        {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={-220 + ((i * 97) % 880)} cy={230 + ((i * 37) % 30)} r="0.8" fill="#6b5442" />)}
      </g>
    );
  }
  if (place === "rooftop") {
    // Decking instead of a road, and a glass railing along the roof edge in front of the queue
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#1e1712" />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1="-1000" x2="1400" y1={228 + i * 7} y2={228 + i * 7} stroke="#120d0a" strokeWidth="1" />)}
        <rect x="-1000" y="246" width="2400" height="16" fill="#9fc4dc" opacity="0.12" />
        <rect x="-1000" y="244" width="2400" height="2.5" fill="#c9dce8" opacity="0.8" />
        {Array.from({ length: 40 }, (_, i) => <rect key={i} x={-300 + i * 30} y="244" width="2" height="18" fill="#c9dce8" opacity="0.6" />)}
      </g>
    );
  }
  if (place === "basement") {
    // A concrete floor, and the steps down from the street beside the door
    return (
      <g>
        <rect x="-1000" y="222" width="2400" height="400" fill="#141118" />
        <line x1="-1000" x2="1400" y1="236" y2="236" stroke="#0b090e" strokeWidth="1" />
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={-120 - i * 14} y={222 - i * 18} width={70} height="6" fill="#2c2338" />
        ))}
        <path d="M-60,222 L-130,140" stroke="#6e6875" strokeWidth="1.5" />
      </g>
    );
  }
  return null;
}

/**
 * What stands right of the door where the street has its shop: the sea, the rest of the roof, or the
 * basement corridor. Only drawn away from the street (QA R21 R-03: the shop and kiosk were on every door).
 */
export function PlaceSide({ place, p }: { place: Place; p: string }) {
  if (MORE_PLACES.has(place)) return <MoreSide place={place} />;
  if (place === "beach") {
    return (
      <g>
        <defs>
          <linearGradient id={`${p}-sea`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123a52" />
            <stop offset="1" stopColor="#0a2232" />
          </linearGradient>
        </defs>
        {/* Open sea where the shop was, the horizon low and a boat's lamp far out */}
        <rect x="372" y="120" width="1100" height="102" fill={`url(#${p}-sea)`} />
        <path d="M372,120 H1472" stroke="#3d7fa0" strokeWidth="1" opacity="0.6" />
        {[140, 160, 182, 204].map((y, i) => (
          <path key={y} d={`M${380 + i * 20},${y} q30,-4 60,0 t60,0 t60,0 t60,0`} stroke="#5aa0c0" strokeWidth="0.8" fill="none" opacity={0.35 - i * 0.05} />
        ))}
        <circle cx="560" cy="126" r="1.6" fill="#ffd27a" />
        <path d="M552,128 h16 l-3,3 h-10 Z" fill="#1b1410" />
        {/* Surf on the sand */}
        <path d="M372,222 q40,-6 80,0 t80,0 t80,0 t80,0" stroke="#cfe6ee" strokeWidth="1.4" fill="none" opacity="0.5" />
        {/* A palm leaning over the water */}
        <g transform="translate(640 222)">
          <path d="M0,0 C10,-50 30,-100 60,-140" stroke="#1b1410" strokeWidth="7" fill="none" />
          {[-50, -10, 30, 70, 110].map((angle) => (
            <path key={angle} d="M60,-140 q30,-10 54,12" stroke="#0f2a1c" strokeWidth="6" fill="none" transform={`rotate(${angle} 60 -140)`} />
          ))}
        </g>
      </g>
    );
  }
  if (place === "rooftop") {
    return (
      <g>
        {/* The roof carries on: a water tank, a vent, and more of the city beyond the parapet */}
        <rect x="372" y="100" width="1100" height="122" fill="#1b1524" />
        <g fill="#120d1d">
          <rect x="430" y="40" width="44" height="60" />
          <rect x="520" y="10" width="34" height="90" />
          <rect x="600" y="52" width="70" height="48" />
        </g>
        <g fill="#f0c27a" opacity="0.5">
          {[[436, 50], [450, 66], [526, 24], [540, 46], [526, 70], [612, 62], [640, 76]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="6" />)}
        </g>
        <g transform="translate(470 140)">
          <rect x="0" y="0" width="46" height="44" rx="4" fill="#2a2234" stroke="#3a3145" />
          <path d="M6,8 H40 M6,18 H40 M6,28 H40" stroke="#3a3145" />
          <rect x="18" y="44" width="4" height="38" fill="#2a2234" />
          <rect x="34" y="44" width="4" height="38" fill="#2a2234" />
        </g>
        <rect x="372" y="200" width="1100" height="22" fill="#2c2338" />
        {/* Planters along the edge */}
        {[400, 560, 620].map((x) => (
          <g key={x} transform={`translate(${x} 222)`}>
            <rect x="-14" y="-16" width="28" height="16" fill="#3a2a22" />
            <path d="M-10,-16 q-6,-22 4,-30 M0,-16 q0,-26 8,-34 M8,-16 q10,-18 2,-28" stroke="#2c6e49" strokeWidth="3" fill="none" />
          </g>
        ))}
      </g>
    );
  }
  if (place === "basement") {
    return (
      <g>
        {/* The corridor runs on: concrete, a fire exit, and the cloakroom hatch */}
        <rect x="372" y="-12" width="1100" height="234" fill="#121016" />
        <path d="M372,-12 V222" stroke="#2c2338" strokeWidth="3" />
        <g transform="translate(560 120)">
          <rect x="-34" y="-50" width="68" height="152" fill="#0b090e" stroke="#2c2338" strokeWidth="2" />
          <rect x="-26" y="-74" width="52" height="14" rx="2" fill="#0f3a22" />
          <text x="0" y="-64" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="7" fill="#7ef0a8">EXIT</text>
          <rect x="-34" y="40" width="68" height="4" fill="#3a3145" />
        </g>
        <rect x="372" y="0" width="1100" height="5" rx="2" fill="#3a3145" />
        <rect x="372" y="9" width="1100" height="3" rx="1.5" fill="#2a2234" />
      </g>
    );
  }
  return null;
}

/** The light by the door: a street lamp on the street, torches on the sand, festoon poles up top, bare bulbs below. */
export function PlaceLight({ place }: { place: Place }) {
  if (MORE_PLACES.has(place)) return <MoreLight place={place} />;
  if (place === "beach") {
    return (
      <g>
        {[300, 350].map((x) => (
          <g key={x}>
            <rect x={x - 1.5} y="150" width="3" height="72" fill="#2b1d16" />
            <path d={`M${x - 4},150 h8 l-2,-6 h-4 Z`} fill="#5a3b24" />
            <path className="flame" d={`M${x},132 q5,7 0,12 q-5,-5 0,-12 Z`} fill="#ffb347" />
            <circle cx={x} cy="140" r="14" fill="#ffb347" opacity="0.12" />
            <ellipse cx={x} cy="224" rx="18" ry="3" fill="#ffb347" opacity="0.15" />
          </g>
        ))}
      </g>
    );
  }
  if (place === "rooftop") {
    return (
      <g>
        <rect x="350" y="20" width="3" height="202" fill="#2a2234" />
        <path d="M352,24 Q300,52 262,40" stroke="#3a3145" strokeWidth="0.8" fill="none" />
        {Array.from({ length: 7 }, (_, i) => {
          const t = (i + 0.5) / 7;
          return <circle key={i} cx={352 - t * 90} cy={24 + 28 * Math.sin(Math.PI * t) - 4 * t} r="1.8" fill="#ffd27a" />;
        })}
        {/* A patio heater */}
        <g transform="translate(318 222)">
          <rect x="-1.5" y="-78" width="3" height="78" fill="#3a3145" />
          <path d="M-14,-78 h28 l-4,-8 h-20 Z" fill="#3a3145" />
          <rect x="-4" y="-74" width="8" height="10" fill="#ff7a3a" opacity="0.7" />
          <ellipse cx="0" cy="0" rx="10" ry="2.5" fill="#000" opacity="0.4" />
        </g>
      </g>
    );
  }
  if (place === "basement") {
    return (
      <g>
        {[300, 345].map((x) => (
          <g key={x}>
            <path d={`M${x},12 V48`} stroke="#0b090e" strokeWidth="1" />
            <circle cx={x} cy="52" r="3.5" fill="#fff1c8" />
            <circle cx={x} cy="52" r="22" fill="#ffe2a0" opacity="0.08" />
          </g>
        ))}
      </g>
    );
  }
  return null;
}

/** Where the street has a food stall: a bar counter indoors and on the roof. */
export function PlaceStall({ place, rim, speaks, index }: { place: Place; rim: string; speaks: boolean; index: number }) {
  const sign = place === "rooftop" ? "SKY BAR" : place === "garden" ? "GARDEN BAR" : place === "lounge" ? "COCKTAILS" : "BAR";
  return (
    <g transform="translate(-170 0)">
      <Goer x={0} y={196} s={0.7} look={{ skin: "#6b4430", top: "#17141c", bottom: "#17141c", hair: "bun", hairColor: "#1c120c", outfit: "shirt", pose: "hold", accent: "#cfa349" }} rim={rim} dark={0.25} index={index} gossip={speaks} />
      <rect x="-46" y="170" width="92" height="52" fill="#2b1d16" />
      <rect x="-50" y="166" width="100" height="6" fill="#5a3b24" />
      <path d="M-46,182 H46" stroke="#1a110c" />
      {[-30, -18, 22, 34].map((x) => <rect key={x} x={x} y="156" width="4" height="10" rx="1" fill={x < 0 ? "#2c6e49" : "#b3243a"} opacity="0.85" />)}
      <rect x="-26" y="190" width="52" height="12" rx="2" fill="#0b0810" />
      <text x="0" y="199" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="7" fill="#ffd27a">{sign}</text>
    </g>
  );
}

/** Where the street has a parked taxi: a canoe on the sand, the DJ on the roof, the cloakroom below. Same speaker slot. */
export function PlaceRide({ place, rim, speaks, index }: { place: Place; rim: string; speaks: boolean; index: number }) {
  if (MORE_PLACES.has(place)) return <MoreRide place={place} rim={rim} speaks={speaks} index={index} />;
  if (place === "beach") {
    return (
      <g transform="translate(520 0)">
        <ellipse cx="0" cy="252" rx="86" ry="5" fill="#000" opacity="0.45" />
        <path d="M-84,232 Q0,262 84,232 L76,244 Q0,266 -76,244 Z" fill="#7a2a1f" />
        <path d="M-80,236 Q0,262 80,236" stroke="#e9b52a" strokeWidth="2.5" fill="none" />
        <path d="M-70,240 Q0,262 70,240" stroke="#2c6e49" strokeWidth="2" fill="none" />
        <Goer x={30} y={230} s={0.72} look={{ skin: "#3b2417", top: "#efe8da", bottom: "#3b4a8f", hair: "low", hairColor: "#1c120c", outfit: "tee", pose: "fold" }} rim={rim} dark={0.3} index={index} gossip={speaks} flip />
      </g>
    );
  }
  if (place === "rooftop") {
    return (
      <g transform="translate(520 0)">
        <Goer x={0} y={200} s={0.72} look={{ skin: "#a8754f", top: "#8f6bff", bottom: "#17141c", hair: "cap", hairColor: "#17141c", accent: "#efe8da", outfit: "hoodie", pose: "dance" }} rim={rim} dark={0.25} index={index} gossip={speaks} />
        <rect x="-50" y="190" width="100" height="40" fill="#17141c" stroke="#3a3145" />
        <circle cx="-24" cy="198" r="8" fill="#2a2234" stroke="#8f6bff" strokeWidth="0.8" />
        <circle cx="24" cy="198" r="8" fill="#2a2234" stroke="#8f6bff" strokeWidth="0.8" />
        <text x="0" y="222" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="7" fill="#8f6bff">DJ</text>
      </g>
    );
  }
  if (place === "basement") {
    return (
      <g transform="translate(470 0)">
        <rect x="-50" y="110" width="100" height="70" fill="#0b090e" stroke="#2c2338" />
        <path d="M-44,124 H44" stroke="#3a3145" strokeWidth="1.5" />
        {[-34, -22, -10, 4, 18, 32].map((x, i) => <path key={x} d={`M${x},124 v6 q-6,20 0,34 h8 q4,-16 -2,-34`} fill={["#3a3f4a", "#5b3a2e", "#1f3a4a", "#4a2a3a", "#2e3a2a", "#2a2234"][i]} />)}
        <Goer x={0} y={214} s={0.72} look={{ skin: "#f1c9a5", top: "#17141c", bottom: "#17141c", hair: "bun", hairColor: "#5b3a2e", outfit: "shirt", pose: "still", accent: "#efe8da" }} rim={rim} dark={0.25} index={index} gossip={speaks} />
        <rect x="-56" y="180" width="112" height="42" fill="#1d1727" />
        <rect x="-60" y="176" width="120" height="5" fill="#3a3145" />
        <text x="0" y="200" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="7" fill="#efe8da">CLOAKROOM</text>
      </g>
    );
  }
  return null;
}

/** The wall neon. The street keeps its area's tag; a place has its own line. */
export function placeWallText(place: Place, street: string): string {
  if (place === "beach") return "TIDE'S IN";
  if (place === "rooftop") return "SKY HIGH";
  if (place === "basement") return "DOWN HERE";
  if (MORE_WALL[place]) return MORE_WALL[place];
  return street;
}

/** A street name plate by the door, in the crowd's city style. It shows on a phone too. */
export function StreetPlate({ text, ground, ink }: { text: string; ground: string; ink: string }) {
  const width = Math.max(44, text.length * 4.6 + 8);
  return (
    <g transform="translate(96 30)">
      <rect x={-width / 2} y="-8" width={width} height="16" rx="1.5" fill={ground} stroke="#17141c" strokeWidth="1" />
      <rect x={-width / 2 + 2} y="-6" width={width - 4} height="12" fill="none" stroke={ink} strokeWidth="0.6" opacity="0.7" />
      <text x="0" y="2.5" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="5.4" fill={ink}>{text}</text>
    </g>
  );
}
