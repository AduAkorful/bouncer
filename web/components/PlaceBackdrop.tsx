import type { Place } from "@/lib/street-setting";

/**
 * What kind of venue the door sits in. The street front is the plain brick wall; the others paint over it.
 * `PlaceBack` sits on the wall behind the sign and the door; `PlaceFront` sits on the ground in front of it.
 * The door, the sign, the bouncer, and the queue stay where they are, so play reads the same at every door.
 */
export function PlaceBack({ place, p }: { place: Place; p: string }) {
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
  if (place === "beach") {
    // Sand instead of wet pavement
    return <rect x="-1000" y="222" width="2400" height="400" fill="#3a2c22" opacity="0.85" />;
  }
  if (place === "rooftop") {
    // A glass railing along the roof edge in front of the queue
    return (
      <g>
        <rect x="-1000" y="236" width="2400" height="2" fill="#8fa3b8" opacity="0.5" />
        {Array.from({ length: 40 }, (_, i) => <rect key={i} x={-300 + i * 30} y="236" width="1.5" height="24" fill="#8fa3b8" opacity="0.35" />)}
      </g>
    );
  }
  if (place === "basement") {
    // Steps down from the street, beside the door
    return (
      <g>
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={-120 - i * 14} y={222 - i * 18} width={70} height="6" fill="#2c2338" />
        ))}
        <path d="M-60,222 L-130,140" stroke="#6e6875" strokeWidth="1.5" />
      </g>
    );
  }
  return null;
}
