import type { ReactNode } from "react";
import { CROWDS, crowdLook, type Crowd } from "@/lib/crowds";
import { CartStall, Passer, Ride, Seller, Sky } from "@/components/StreetMore";
import { StreetPlate, PlaceBack, PlaceFront, PlaceLight, PlaceRide, PlaceSide, PlaceStall, placeWallText } from "@/components/PlaceBackdrop";
import { SAM, NEONS, type Look, type Neon } from "@/lib/look";
import { Bouncer } from "./Bouncer";
import { Goer, type GoerLook } from "./Goer";
import { type CityId } from "@/lib/cities";
import { citySetting, posterLines, shopCopy, streetPieces, type StreetSetting } from "@/lib/street-setting";
import { BlackCab, KebabVan, NextDoor, NightBus, Okada, PosterWall, Rain, RoseSeller, SuyaStand, Taxi, VipWindow, WaterSeller } from "./Street";

interface Props {
  sign: string;
  look?: Look;
  neon?: Neon;
  /** Rope down, doors open and the bouncer stepped aside: someone got in. */
  open?: boolean;
  queue?: boolean;
  /** Enable street inspection affordances. */
  gossip?: boolean;
  /** Queue slots that have lines to overhear. */
  speakingSlots?: readonly boolean[];
  /** Which city's street surrounds the door, when no setting is passed. */
  city?: CityId;
  /** The sponsor's mix of street pieces. Omitted streets stay Accra, or the city above. */
  setting?: StreetSetting;
  /** Extra SVG drawn behind the bouncer (on the wall) and in front of everything (street props). */
  back?: ReactNode;
  front?: ReactNode;
  /** Prefix for gradient ids, so two scenes on one page don't collide. */
  p?: string;
  viewBox?: string;
  className?: string;
  label?: string;
  /** The next-door shop and the poster wall. Off when the frame would clip them. */
  neighbors?: boolean;
  /** Tube colour for this door. The default neon stays when this is omitted. */
  ink?: { stroke: string; fill: string };
  /** The sign is inside a link that already names the door. */
  decorative?: boolean;
  /** Cover the frame and crop the edges. The door pages keep the whole street in view. */
  fit?: "meet" | "cover";
  /** The green-dress figure at the lamp. The door page moves her clear of the pot board. */
  lampFigureX?: number;
}

// The queue. The front four talk if you tap them (index → queueGossip); the rest are the crowd behind.
const P = {
  yellow: { skin: "#4a2e1f", top: "#e9b52a", bottom: "#1d2a44", hair: "low", hairColor: "#1c120c", outfit: "shirt", pose: "phone", accent: "#efe8da" },
  puff: { skin: "#6b4430", top: "#b3243a", bottom: "#1d1727", hair: "puff", hairColor: "#1c120c", outfit: "dress", pose: "selfie" },
  cap: { skin: "#3b2417", top: "#efe8da", bottom: "#3a3145", hair: "cap", hairColor: "#b3243a", accent: "#b3243a", outfit: "jacket", pose: "chat", broad: true },
  braids: { skin: "#8a5a3c", top: "#2c6e49", bottom: "#1d1727", hair: "braids", hairColor: "#1c120c", outfit: "dress", pose: "fold" },
} satisfies Record<string, GoerLook>;

const CROWD: { x: number; s: number; look: GoerLook; dark: number }[] = [
  { x: -66, s: 0.68, dark: 0.55, look: { skin: "#3b2417", top: "#3b4a8f", bottom: "#1d1727", hair: "locs", hairColor: "#1c120c", outfit: "tee", pose: "dance" } },
  { x: -44, s: 0.7, dark: 0.5, look: { skin: "#a8754f", top: "#8f6bff", bottom: "#1d1727", hair: "bun", hairColor: "#2a1a10", outfit: "dress", pose: "phone" } },
  { x: -20, s: 0.7, dark: 0.5, look: { skin: "#4a2e1f", top: "#1d1727", bottom: "#2a2234", hair: "cap", hairColor: "#efe8da", outfit: "hoodie", pose: "fold", broad: true } },
  { x: 4, s: 0.72, dark: 0.45, look: { skin: "#6b4430", top: "#cfa349", bottom: "#1d1727", hair: "headwrap", hairColor: "#1c120c", accent: "#2c6e49", outfit: "dress", pose: "chat" } },
  { x: 26, s: 0.72, dark: 0.45, look: { skin: "#3b2417", top: "#b3243a", bottom: "#17141c", hair: "low", hairColor: "#1c120c", outfit: "tee", pose: "hold", accent: "#efe8da" } },
  { x: 46, s: 0.74, dark: 0.4, look: { skin: "#c99a72", top: "#efe8da", bottom: "#3b4a8f", hair: "braids", hairColor: "#2a1a10", outfit: "tee", pose: "dance" } },
];

/**
 * The queue behind the front four changes with the place: a short line at a basement stair, people spread out
 * on the sand, a looser group on a roof. Each crowd also stands in its own order, not only in other clothes.
 */
function crowdFor(place: string, crowd: Crowd): typeof CROWD {
  let rows = crowd.original ? CROWD : crowd.order.map((from, i) => ({ ...CROWD[from], x: CROWD[i].x }));
  if (place === "basement" || place === "lounge") return rows.slice(2).map((row, i) => ({ ...row, x: -10 + i * 20, s: row.s * 0.97 }));
  if (place === "beach" || place === "garden") rows = rows.map((row, i) => ({ ...row, x: -96 + i * 30, look: { ...row.look, pose: i % 2 ? "dance" : row.look.pose } }));
  if (place === "rooftop" || place === "warehouse") rows = rows.filter((_, i) => i !== 1).map((row, i) => ({ ...row, x: [-70, -40, -4, 20, 46][i], look: { ...row.look, pose: i === 2 ? "selfie" : row.look.pose } }));
  return rows;
}

/** Places with a bar where the street has a food stall, and places with a roof over the queue. */
const BAR_PLACES = new Set<string>(["rooftop", "basement", "garden", "warehouse", "lounge"]);
const INDOORS = new Set<string>(["basement", "lounge"]);
/** Places where the sky shows, so stars and fireworks have somewhere to be. */
const OPEN_AIR = new Set<string>(["beach", "rooftop", "garden", "harbour"]);

function passerFor(passer: string) {
  if (passer === "okada") return <Okada />;
  if (passer === "bus") return <NightBus />;
  if (passer === "bike" || passer === "tram" || passer === "skater") return <Passer kind={passer} />;
  return null;
}

/** A short queue keeps the three nearest the door; a packed one fills the gaps with people standing behind. */
function sizeQueue(rows: typeof CROWD, size: string): typeof CROWD {
  if (size === "short") return rows.slice(-3);
  if (size !== "packed" || rows.length < 2) return rows;
  const behind = rows.slice(1).map((row, i) => ({ ...rows[(i + 3) % rows.length], x: (rows[i].x + row.x) / 2, s: row.s * 0.9, dark: Math.min(0.75, row.dark + 0.15) }));
  return [...behind, ...rows];
}

const BRICKS: Record<Crowd["brick"], [string, string, string]> = {
  block: ["#1a1422", "#1e1727", "#1d1626"],
  stock: ["#2a251d", "#352e22", "#2f2920"],
  red: ["#2a1716", "#341c1a", "#2f1918"],
  render: ["#1d1a22", "#211e27", "#201c26"],
};

const BULBS = [
  ...Array.from({ length: 9 }, (_, i) => [150 + i * 12.5, 66] as const),
  ...Array.from({ length: 11 }, (_, i) => [146.5, 79 + i * 13] as const),
  ...Array.from({ length: 11 }, (_, i) => [253.5, 79 + i * 13] as const),
];

const SIGN_ROOM = 150;
const SIGN_EM = 0.69;

/**
 * The door at night: brick wall, neon sign, a frame of bulbs, two doors with the party showing through the
 * portholes, the queue, the bouncer, the rope, and wet pavement giving all of it back.
 * Ids and classes are hooks for lib/idle.ts and the play timelines.
 */
export function DoorScene({
  sign,
  look = SAM,
  neon = "uv",
  open = false,
  queue = true,
  gossip = false,
  speakingSlots,
  city = "accra",
  setting,
  back,
  front,
  p = "s",
  viewBox = "60 -90 280 350",
  className = "",
  label = "A bouncer at the door of the venue",
  neighbors = true,
  ink,
  decorative = false,
  lampFigureX = 318,
  fit = "meet",
}: Props) {
  const n = ink ?? NEONS.find((x) => x.value === neon) ?? NEONS[0];
  const street = setting ?? citySetting(city);
  const pieces = streetPieces(street);
  const crowdKind = CROWDS.find((entry) => entry.id === pieces.crowd) ?? CROWDS[0];
  // The four who talk keep their poses, which the play screen points at; the crowd behind takes the crowd's.
  const dress = (look: GoerLook, index: number) => crowdLook(crowdKind, look, index, index >= 6);
  const shop = shopCopy(street);
  const baseSlips = posterLines(street, sign);
  const slips = { ...baseSlips, wall: placeWallText(pieces.place, baseSlips.wall) };
  const onStreet = pieces.place === "street";
  const crowd = sizeQueue(crowdFor(pieces.place, crowdKind), pieces.queue);
  const speaks = (slot: number) => speakingSlots?.[slot] ?? false;
  // Bungee Inline runs about 0.69 em a letter (QA measured 165–171 units for 18 letters at 14).
  // The frame is 162 wide; 150 leaves room for the tube. Long signs shrink, and textLength holds the last few.
  const fs = Math.min(sign.length > 12 ? 14 : sign.length > 10 ? 17 : 22, SIGN_ROOM / (Math.max(1, sign.length) * SIGN_EM));
  const signFit = sign.length * fs * SIGN_EM > SIGN_ROOM ? { textLength: SIGN_ROOM, lengthAdjust: "spacingAndGlyphs" as const } : {};
  const leaf = (hinge: number) => (open ? `translate(${hinge} 0) scale(0.14 1) translate(${-hinge} 0)` : undefined);
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMax meet"}
      className={className}
      data-stall={pieces.stall}
      data-ride={pieces.ride}
      data-passer={pieces.passer}
      data-seller={pieces.seller}
      data-shop={pieces.shop}
      data-weather={pieces.weather}
      data-posters={pieces.posters}
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <defs>
        <pattern id={`${p}-brick`} width="24" height="12" patternUnits="userSpaceOnUse">
          {/* The wall follows the crowd's city: painted block, yellow stock brick, red brick, or render */}
          <rect width="24" height="12" fill={BRICKS[crowdKind.brick][0]} />
          <rect x="1" y="1" width="10.4" height="4.4" fill={BRICKS[crowdKind.brick][1]} />
          <rect x="13" y="7" width="10.4" height="4.4" fill={BRICKS[crowdKind.brick][2]} />
          <path d="M0,6 H24 M0,0 H24 M12,0 V6 M0,0 V6 M6,6 V12 M18,6 V12" stroke="#0d0a12" strokeWidth="1" />
        </pattern>
        <linearGradient id={`${p}-wallShade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07050a" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#07050a" stopOpacity="0.15" />
          <stop offset="0.9" stopColor="#07050a" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={`${p}-vignette`} cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </radialGradient>
        <radialGradient id={`${p}-wash`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={n.stroke} stopOpacity="0.32" />
          <stop offset="0.6" stopColor={n.stroke} stopOpacity="0.08" />
          <stop offset="1" stopColor={n.stroke} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-doorGlow`} cx="0.5" cy="0.95" r="0.9">
          <stop offset="0" stopColor="#8f6bff" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#8f6bff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-inside`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#e2d6ff" />
          <stop offset="0.45" stopColor="#8f6bff" />
          <stop offset="1" stopColor="#b3243a" />
        </radialGradient>
        <linearGradient id={`${p}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${p}-pool`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-uvPool`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8f6bff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8f6bff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15101c" />
          <stop offset="1" stopColor="#09070d" />
        </linearGradient>
        <linearGradient id={`${p}-reflect`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={n.stroke} stopOpacity="0.5" />
          <stop offset="1" stopColor={n.stroke} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${p}-reflectUv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9a2ff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#b9a2ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${p}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b55b8" stopOpacity="0" />
          <stop offset="1" stopColor="#6b55b8" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id={`${p}-brass`} x1="0" x2="1">
          <stop offset="0" stopColor="#6e5020" />
          <stop offset=".4" stopColor="#f4dc9c" />
          <stop offset=".6" stopColor="#c99a45" />
          <stop offset="1" stopColor="#5a4018" />
        </linearGradient>
        <linearGradient id={`${p}-velvet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e04a62" />
          <stop offset="1" stopColor="#6e1222" />
        </linearGradient>
        <radialGradient id={`${p}-spill`} cx="0.5" cy="0.15" r="0.8">
          <stop offset="0" stopColor={n.stroke} stopOpacity="0.2" />
          <stop offset="0.65" stopColor={n.stroke} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-bulb`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe9b0" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}-phL`}>
          <circle cx="178" cy="86" r="7" />
        </clipPath>
        <clipPath id={`${p}-phR`}>
          <circle cx="222" cy="86" r="7" />
        </clipPath>
      </defs>
      {/* The scene is one picture with one label. Its painted words are not read out one by one. */}
      <g aria-hidden="true">

      {/* The wall */}
      <rect x="-1000" y="-1000" width="2400" height="1222" fill={`url(#${p}-brick)`} />
      <rect x="-1000" y="-260" width="2400" height="482" fill={`url(#${p}-wallShade)`} />
      <g aria-hidden>
        {/* Upstairs: the VIP floor, lasers through the glass */}
        <VipWindow x={80} y={-76} p={p} id="a" />
        <VipWindow x={284} y={-76} p={p} id="b" />
        <VipWindow x={-40} y={-76} p={p} id="c" />
        <rect x="-150" y="-76" width="36" height="44" fill="#0b0810" stroke="#2a2234" strokeWidth="2" />
        <rect x="-148" y="-74" width="32" height="40" fill="#f0c27a" opacity="0.12" />
        {/* Security camera watching the queue */}
        <g transform="translate(268 66)">
          <rect x="-1" y="-6" width="2" height="8" fill="#2a2234" />
          <g className="cam" style={{ transformOrigin: "0px 0px" }}>
            <rect x="-11" y="-3" width="12" height="6" rx="1" fill="#2a2234" />
            <circle className="led" cx="-9" cy="0" r="0.9" fill="#ff3a4a" />
          </g>
        </g>
        <rect x="70" y="-1000" width="5" height="1222" fill="#0f0b15" />
        <rect x="70" y="-1000" width="1.2" height="1222" fill={n.stroke} opacity="0.12" />
      </g>

      <PlaceBack place={pieces.place} p={p} />

      {neighbors ? (onStreet ? <NextDoor x={372} p={p} ad={shop.ad} kiosk={shop.kiosk} shutter={shop.shutter} hints={gossip} tone={shop.tone} /> : <PlaceSide place={pieces.place} p={p} />) : null}
      {onStreet && crowdKind.plate ? <StreetPlate {...crowdKind.plate} /> : null}
      {neighbors ? <PosterWall x={-30} hints={gossip} slips={slips} /> : null}

      {/* Colour thrown on the brick by the sign */}
      <ellipse cx="200" cy="44" rx="190" ry="120" fill={`url(#${p}-wash)`} style={{ mixBlendMode: "screen" }} />

      {/* Sign: a box on brackets, the tube lit in three layers (halo, colour, white-hot core) */}
      <g aria-hidden>
        <rect x="132" y="8" width="3" height="10" fill="#2a2234" />
        <rect x="265" y="8" width="3" height="10" fill="#2a2234" />
        <rect x="112" y="16" width="176" height="46" rx="5" fill="#0b0810" stroke="#2a2234" strokeWidth="1.5" />
        {[
          [117, 21],
          [283, 21],
          [117, 57],
          [283, 57],
        ].map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="1.2" fill="#3a3145" />
        ))}
      </g>
      <g data-part="sign">
        <rect x="119" y="22" width="162" height="34" rx="5" fill="none" stroke={n.stroke} strokeWidth="7" strokeOpacity="0.28" />
        <text x="200" y="48" textAnchor="middle" fontFamily="var(--font-bungee-inline)" fontSize={fs} {...signFit} fill={n.stroke} opacity="0.35">
          {sign}
        </text>
        <rect x="119" y="22" width="162" height="34" rx="5" fill="none" stroke={n.stroke} strokeWidth="1.8" />
        <rect x="119" y="22" width="162" height="34" rx="5" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="0.6" />
        <text x="200" y="48" textAnchor="middle" fontFamily="var(--font-bungee-inline)" fontSize={fs} {...signFit} fill={n.fill}>
          {sign}
        </text>
        <text x="200" y="48" textAnchor="middle" fontFamily="var(--font-bungee-inline)" fontSize={fs} {...signFit} fill="#fff" opacity="0.55">
          {sign}
        </text>
      </g>

      {/* Door frame and bulbs */}
      <rect x="141" y="61" width="118" height="161" rx="3" fill="#120d19" />
      <rect data-part="door-glow" x="120" y="40" width="160" height="190" fill={`url(#${p}-doorGlow)`} />
      <rect x="152" y="72" width="96" height="150" fill="#07050a" />
      <rect data-part="door-light" x="152" y="72" width="96" height="150" fill={`url(#${p}-inside)`} opacity={open ? 0.85 : 0} />
      <g data-part="door-leaves">
        <g data-part="door-leaf-l" transform={leaf(152)}>
          <rect x="152" y="72" width="48" height="150" fill="#16101f" />
          <rect x="157" y="124" width="38" height="44" rx="1.5" fill="none" stroke="#231a2e" strokeWidth="1.5" />
          <rect x="157" y="174" width="38" height="40" rx="1.5" fill="none" stroke="#231a2e" strokeWidth="1.5" />
          <circle cx="178" cy="86" r="8.5" fill="#2a2234" />
          <g clipPath={`url(#${p}-phL)`}>
            <rect x="170" y="78" width="16" height="16" fill={`url(#${p}-inside)`} className="porthole" />
            <Dancers x={178} />
          </g>
          <rect x="196" y="132" width="2" height="26" rx="1" fill="#6e6875" />
        </g>
        <g data-part="door-leaf-r" transform={leaf(248)}>
          <rect x="200" y="72" width="48" height="150" fill="#140e1c" />
          <rect x="205" y="124" width="38" height="44" rx="1.5" fill="none" stroke="#211829" strokeWidth="1.5" />
          <rect x="205" y="174" width="38" height="40" rx="1.5" fill="none" stroke="#211829" strokeWidth="1.5" />
          <circle cx="222" cy="86" r="8.5" fill="#2a2234" />
          <g clipPath={`url(#${p}-phR)`}>
            <rect x="214" y="78" width="16" height="16" fill={`url(#${p}-inside)`} className="porthole" />
            <Dancers x={222} />
          </g>
          <rect x="202" y="132" width="2" height="26" rx="1" fill="#6e6875" />
        </g>
        <line x1="200" y1="72" x2="200" y2="222" stroke="#07050a" strokeWidth="1" opacity={open ? 0 : 1} />
      </g>
      <rect x="152" y="219" width="96" height="3" fill="#b9a2ff" opacity="0.7" />
      {/* Smoke machine haze leaking out under the door */}
      <g fill="#b9a2ff" aria-hidden>
        {[160, 180, 200, 220, 240].map((cx, i) => (
          <ellipse key={cx} className="wisp" data-dir={cx < 200 ? -1 : 1} cx={cx} cy={219} rx={10 + (i % 2) * 4} ry="3" opacity="0" />
        ))}
      </g>
      <g data-part="bulbs">
        {BULBS.map(([cx, cy], i) => (
          <g key={i} className="bulb">
            <circle cx={cx} cy={cy} r="5.5" fill={`url(#${p}-bulb)`} />
            <circle cx={cx} cy={cy} r="2" fill="#fff1c8" />
          </g>
        ))}
      </g>

      {/* Street lamp, or the place's own light */}
      {onStreet ? (
      <g aria-hidden>
        <path d="M352,222 V40 Q352,26 336,26 H326" stroke="#0d0a12" strokeWidth="4" fill="none" />
        <path d="M352,222 V40 Q352,26 336,26 H326" stroke={n.stroke} strokeOpacity="0.15" strokeWidth="1" fill="none" transform="translate(-1.6 0)" />
        <path d="M312,26 h20 l-3,8 h-14 Z" fill="#1d1727" />
        <rect x="315" y="33" width="14" height="2.5" rx="1" fill="#fff1c8" />
        <path data-part="lamp-cone" d="M315,35 L286,222 L362,222 L329,35 Z" fill={`url(#${p}-cone)`} />
        <ellipse cx="322" cy="224" rx="44" ry="7" fill={`url(#${p}-pool)`} />
        <g data-part="dust" fill="#ffe2a0">
          {[
            [316, 70, 0.9],
            [326, 96, 0.7],
            [310, 118, 1],
            [330, 134, 0.6],
            [320, 160, 0.8],
            [304, 100, 0.5],
            [336, 180, 0.7],
          ].map(([cx, cy, r], i) => (
            <circle key={i} className="mote" cx={cx} cy={cy} r={r} opacity="0.5" />
          ))}
        </g>
      </g>
      ) : (
        <PlaceLight place={pieces.place} />
      )}

      {back}

      {/* Wet pavement, giving the lights back */}
      <rect x="-1000" y="222" width="2400" height="400" fill={`url(#${p}-ground)`} />
      <line x1="-1000" x2="1400" y1="222.5" y2="222.5" stroke="#2c2338" strokeWidth="1.5" />
      <line x1="-1000" x2="1400" y1="252" y2="252" stroke="#05040a" strokeWidth="2" />
      <line x1="-1000" x2="1400" y1="253.5" y2="253.5" stroke="#2c2338" strokeWidth="0.8" opacity="0.6" />
      <g aria-hidden>
        <rect x="120" y="223" width="160" height="38" fill={`url(#${p}-reflect)`} opacity="0.85" />
        <rect data-part="door-reflect" x="154" y="223" width="92" height="30" fill={`url(#${p}-reflectUv)`} opacity={open ? 1 : 0.6} />
        <rect x="312" y="223" width="20" height="34" fill="#ffe2a0" opacity="0.3" />
        {BULBS.filter(([, cy]) => cy > 185).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={446 - cy} r="2" fill="#ffe9b0" opacity="0.35" />
        ))}
        <ellipse cx="150" cy="238" rx="30" ry="3.5" fill={n.stroke} opacity="0.22" />
        <ellipse cx="262" cy="244" rx="22" ry="3" fill={n.stroke} opacity="0.18" />
      </g>
      <ellipse cx="150" cy="238" rx="30" ry="3.5" fill="none" stroke="#fff" strokeOpacity="0.06" />
      <ellipse className="puddle-ring" cx="150" cy="238" rx="6" ry="0.8" fill="none" stroke={n.stroke} strokeWidth="0.6" opacity="0" />
      <ellipse className="puddle-ring" cx="262" cy="244" rx="5" ry="0.7" fill="none" stroke={n.stroke} strokeWidth="0.6" opacity="0" />
      <ellipse data-part="door-pool" cx="200" cy="225" rx="74" ry="9" fill={`url(#${p}-uvPool)`} opacity={open ? 1 : 0.5} style={{ mixBlendMode: "screen" }} />
      <PlaceFront place={pieces.place} />

      {queue && (
        <g data-part="queue">
          {BAR_PLACES.has(pieces.place) ? (
            <PlaceStall place={pieces.place} rim={n.stroke} speaks={speaks(4)} index={4} />
          ) : pieces.stall === "kebab" ? (
            <KebabVan x={-176} p={p} gossip={gossip} speaks={speaks(4)} index={4} />
          ) : pieces.stall === "suya" ? (
            <SuyaStand x={-170} p={p} rim={n.stroke} gossip={gossip} speaks={speaks(4)} index={4} />
          ) : (
            <CartStall kind={pieces.stall} x={-170} rim={n.stroke} gossip={gossip} speaks={speaks(4)} index={4} />
          )}
          {crowd.map((c, i) => (
            <Goer key={i} x={c.x} y={216} s={c.s} look={dress(c.look, i)} rim={n.stroke} dark={c.dark} />
          ))}
          <Goer x={66} s={0.78} look={dress(P.yellow, 6)} rim={n.stroke} dark={0.22} index={0} gossip={speaks(0)} />
          <Goer x={90} s={0.78} look={dress(P.puff, 7)} rim={n.stroke} dark={0.2} index={1} gossip={speaks(1)} />
          <Goer x={114} s={0.8} look={dress(P.cap, 8)} rim={n.stroke} dark={0.18} index={2} gossip={speaks(2)} />
          {pieces.seller === "roses" ? (
            <RoseSeller x={-96} rim={n.stroke} gossip={speaks(6)} index={6} />
          ) : pieces.seller === "water" ? (
            <WaterSeller x={-96} rim={n.stroke} gossip={speaks(6)} index={6} />
          ) : (
            <Seller kind={pieces.seller} x={-96} rim={n.stroke} gossip={speaks(6)} index={6} />
          )}
          {/* Visitors by the shutter, clear of the kiosk's service window. */}
          <g className="street-pair">
            <Goer x={560} s={0.74} look={{ skin: "#4a2e1f", top: "#2a2234", bottom: "#17141c", hair: "low", hairColor: "#1c120c", outfit: "jacket", pose: "still", accent: "#e9b52a", broad: true }} rim={n.stroke} dark={0.3} flip />
            <Goer x={584} s={0.72} look={{ skin: "#8a5a3c", top: "#efe8da", bottom: "#17141c", hair: "puff", hairColor: "#2a1a10", outfit: "dress", pose: "hold" }} rim={n.stroke} dark={0.3} flip />
          </g>
          <Goer x={612} s={0.76} look={{ skin: "#3b2417", top: "#3b4a8f", bottom: "#2a2234", hair: "locs", hairColor: "#1c120c", outfit: "hoodie", pose: "phone" }} rim="#ffe2a0" dark={0.35} flip />
          <Goer x={lampFigureX} s={0.76} look={dress(P.braids, 9)} rim={n.stroke} dark={0.2} index={3} gossip={speaks(3)} flip />
        </g>
      )}

      <Bouncer look={look} x={open ? 290 : 200} y={226} scale={0.8} p={p} pose={open ? "aside" : "idle"} rim={n.stroke} />

      {/* The sign's colour falls on the bouncer */}
      <ellipse data-part="neon-spill" cx="200" cy="100" rx="110" ry="85" fill={`url(#${p}-spill)`} style={{ mixBlendMode: "screen" }} pointerEvents="none" />

      <g data-part="rope-closed" opacity={open ? 0 : 1}>
        <path d="M128,182 C170,214 230,214 272,182" stroke={`url(#${p}-velvet)`} strokeWidth="6.5" fill="none" strokeLinecap="round" />
        <path d="M134,186 C172,210 228,210 266,186" stroke="#ff9aab" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
      </g>
      <g data-part="rope-open" opacity={open ? 1 : 0}>
        <path d="M128,182 C130,206 136,220 160,222 C180,223 190,221 200,222" stroke={`url(#${p}-velvet)`} strokeWidth="6.5" fill="none" strokeLinecap="round" />
      </g>
      <g>
        {[128, 272].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="225" rx="15" ry="3.5" fill="#000" opacity="0.5" />
            <rect x={x - 6} y="178" width="12" height="46" rx="2" fill={`url(#${p}-brass)`} />
            <circle cx={x} cy="176" r="7.5" fill={`url(#${p}-brass)`} />
            <circle cx={x - 2.5} cy="173.5" r="2" fill="#fff8e0" opacity="0.7" />
            <ellipse cx={x} cy="223.5" rx="12" ry="3" fill="#7a5a20" />
          </g>
        ))}
      </g>

      <rect x="-1000" y="160" width="2400" height="100" fill={`url(#${p}-haze)`} pointerEvents="none" />
      <g data-part="near">
        {queue &&
          (!onStreet ? (
            <PlaceRide place={pieces.place} rim={n.stroke} speaks={speaks(5)} index={5} />
          ) : pieces.ride === "cab" ? (
            <BlackCab x={520} rim={n.stroke} gossip={gossip} speaks={speaks(5)} index={5} />
          ) : pieces.ride === "taxi" ? (
            <Taxi x={520} p={p} rim={n.stroke} gossip={gossip} speaks={speaks(5)} index={5} />
          ) : (
            <Ride kind={pieces.ride} x={520} rim={n.stroke} gossip={gossip} speaks={speaks(5)} index={5} />
          ))}
        {/* Traffic only passes on the street */}
        {onStreet && !decorative ? passerFor(pieces.passer) : null}
      </g>
      {front}
      {pieces.weather === "rain" && !INDOORS.has(pieces.place) && <Rain />}
      {pieces.weather === "snow" && !INDOORS.has(pieces.place) && <Sky kind="snow" />}
      {pieces.weather === "fog" && <Sky kind="fog" />}
      {(pieces.weather === "fireworks" || pieces.weather === "stars") && OPEN_AIR.has(pieces.place) && <Sky kind={pieces.weather} />}

      {/* A passing car's headlights, swept across now and then */}
      <g data-part="headlights" opacity="0" style={{ mixBlendMode: "screen" }} pointerEvents="none">
        <path d="M-60,250 L40,110 L120,110 L20,250 Z" fill={`url(#${p}-beam)`} />
      </g>
      <rect x="-1000" y="-1000" width="2400" height="1600" fill={`url(#${p}-vignette)`} pointerEvents="none" />
      </g>
    </svg>
  );
}

/** The party, seen through a porthole: a few heads bobbing in UV. */
function Dancers({ x }: { x: number }) {
  return (
    <g fill="#1a0f2a">
      {[-5, 0, 5].map((dx, i) => (
        <g key={dx} className="dancer" data-i={i}>
          <circle cx={x + dx} cy={87 + (i % 2) * 1.5} r="2.6" />
          <rect x={x + dx - 3.5} y={89.5 + (i % 2) * 1.5} width="7" height="8" rx="3" />
        </g>
      ))}
    </g>
  );
}
