import { SKINS, type Look } from "@/lib/look";
import { cuffPoints, dims, pose as poseOf, solve, type ArmGeom, type PoseName } from "@/lib/rig";

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

const CLOTH = {
  suit: { lit: "#3a3050", base: "#1c1626", dark: "#0c0912", sleeve: "#2c2339", cuff: "#efe8da" },
  kente: { lit: "#3a3050", base: "#1c1626", dark: "#0c0912", sleeve: "#2c2339", cuff: "#efe8da" },
  bomber: { lit: "#3a4d43", base: "#1f2a25", dark: "#0f1612", sleeve: "#2c3b33", cuff: "#121915" },
  hivis: { lit: "#34303e", base: "#1a1722", dark: "#0c0a10", sleeve: "#2a2533", cuff: "#2a2533" },
  irongate: { lit: "#666b78", base: "#3a3d46", dark: "#1f2126", sleeve: "#50545f", cuff: "#efe8da" },
} as const;

interface Props {
  look: Look;
  x: number;
  y: number;
  scale?: number;
  /** Gradient-id prefix, unique per scene */
  p: string;
  pose?: PoseName;
  /** Colour of the light behind and above: the neon sign or the door */
  rim?: string;
  /** What's in their hands: the guest list, or the back office's ledger */
  holds?: "clipboard" | "ledger";
  /** Behind a desk: no legs drawn */
  seated?: boolean;
}

/**
 * A bouncer built from parts, feet at (0,0). Arms are a rig (lib/rig.ts): shoulders, elbows and hands are solved
 * from where the board is, so the hands never let go of it. data-part hooks are what lib/rigMotion.ts moves.
 * Every bouncer reads with the same animation; reactions play only after a verdict.
 */
export function Bouncer({ look, x, y, scale = 1, p, pose = "idle", rim = "#b9a2ff", holds = "clipboard", seated = false }: Props) {
  const d = dims(look.build);
  const g = solve(d, poseOf(pose));
  const { w, top } = d;
  const base = SKINS[look.skin] ?? SKINS[1];
  const skin = `url(#${p}-skin)`;
  const cloth = CLOTH[look.outfit];
  const formal = look.outfit === "suit" || look.outfit === "kente" || look.outfit === "irongate";
  const waist = Math.round(w * 0.74);
  const jacket = `M${-waist},-50 L${-(w - 1)},${top + 34} Q${-(w + 1)},${top + 6} ${-(w - 16)},${top + 1} L-12,${top - 2} L12,${top - 2} L${w - 16},${top + 1} Q${w + 1},${top + 6} ${w - 1},${top + 34} L${waist},-50 Q0,-45 ${-waist},-50 Z`;

  const arm = (side: "L" | "R", a: ArmGeom) => {
    const [cx1, cy1, cx2, cy2] = cuffPoints(a);
    const off = side === "L" ? "translate(-1.4 -1.4)" : "translate(1.4 -1.4)";
    return (
      <g>
        {/* Shadow the arm throws on the jacket, then an ink outline so it reads against the body */}
        <g transform="translate(1 3.5)" stroke="#000" strokeOpacity="0.4" strokeLinecap="round">
          <line data-part={`arm${side}-up`} x1={a.sx} y1={a.sy} x2={a.ex} y2={a.ey} strokeWidth={d.uw} />
          <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} strokeWidth={d.fw} />
        </g>
        <g stroke="#06040a" strokeLinecap="round">
          <line data-part={`arm${side}-up`} x1={a.sx} y1={a.sy} x2={a.ex} y2={a.ey} strokeWidth={d.uw + 2.6} />
          <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} strokeWidth={d.fw + 2.6} />
        </g>
        <g transform={off} stroke={rim} strokeOpacity="0.7" strokeLinecap="round">
          <line data-part={`arm${side}-up`} x1={a.sx} y1={a.sy} x2={a.ex} y2={a.ey} strokeWidth={d.uw} />
          <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} strokeWidth={d.fw} />
        </g>
        <g stroke={cloth.sleeve} strokeLinecap="round">
          <line data-part={`arm${side}-up`} x1={a.sx} y1={a.sy} x2={a.ex} y2={a.ey} strokeWidth={d.uw - 1} />
          <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} strokeWidth={d.fw - 1} />
        </g>
        <line data-part={`cuff${side}`} x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke={cloth.cuff} strokeWidth={d.fw - 2} />
      </g>
    );
  };

  // A hand that isn't gripping the edge (pen, palm, mug) is in front of the board, so its forearm must be too.
  const inFront = (shape: string) => shape !== "grip";
  const foreFront = (side: "L" | "R", a: ArmGeom, shape: string) => {
    const [cx1, cy1, cx2, cy2] = cuffPoints(a);
    const off = side === "L" ? "translate(-1.4 -1.4)" : "translate(1.4 -1.4)";
    return (
      <g data-front={side} style={inFront(shape) ? undefined : { display: "none" }} strokeLinecap="round">
        <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} stroke="#06040a" strokeWidth={d.fw + 2.6} />
        <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} transform={off} stroke={rim} strokeOpacity="0.7" strokeWidth={d.fw} />
        <line data-part={`arm${side}-fore`} x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} stroke={cloth.sleeve} strokeWidth={d.fw - 1} />
        <line data-part={`cuff${side}`} x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke={cloth.cuff} strokeWidth={d.fw - 2} />
      </g>
    );
  };

  return (
    <g id="bouncer" data-rig data-build={look.build} data-pose={pose} transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <linearGradient id={`${p}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(base, 1.22)} />
          <stop offset="1" stopColor={shade(base, 0.8)} />
        </linearGradient>
        <linearGradient id={`${p}-jacket`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cloth.lit} />
          <stop offset="0.38" stopColor={cloth.base} />
          <stop offset="1" stopColor={cloth.dark} />
        </linearGradient>
      </defs>

      {!seated && (
        <g>
          <ellipse cx="0" cy="1" rx={w + 4} ry="7" fill="#000" opacity="0.55" />
          {/* Trousers and shoes */}
          <path d={`M${-waist + 2},-52 L-26,-3 L-7,-3 L-1,-52 Z M${waist - 2},-52 L26,-3 L7,-3 L1,-52 Z`} fill="#0b0910" />
          <path d="M-15,-46 L-17,-6 M15,-46 L17,-6" stroke={rim} strokeOpacity="0.18" strokeWidth="1" />
          <path d="M-32,1 Q-32,-7 -20,-7 L-6,-6 Q-2,-3 -3,1 Z M32,1 Q32,-7 20,-7 L6,-6 Q2,-3 3,1 Z" fill="#050407" />
          <ellipse cx="-22" cy="-4" rx="4" ry="1.2" fill="#fff" opacity="0.22" />
          <ellipse cx="22" cy="-4" rx="4" ry="1.2" fill="#fff" opacity="0.22" />
        </g>
      )}

      <g data-part="torso" transform={g.torso}>
        {/* Rim light: the jacket's outline catches the light behind */}
        <path d={jacket} fill="none" stroke={rim} strokeWidth="3.2" strokeOpacity="0.6" />
        <path d={jacket} fill={`url(#${p}-jacket)`} />
        <rect x={-waist + 1} y="-56" width={waist * 2 - 2} height="5" rx="1" fill="#07050a" />
        <rect x="-3" y="-55.5" width="6" height="4" rx="0.8" fill="#9a94a3" />

        {/* Neck: thick, shadowed under the jaw */}
        <path d={`M-11,${top - 14} L11,${top - 14} L13,${top + 2} L-13,${top + 2} Z`} fill={skin} />
        <path d={`M-11,${top - 14} L11,${top - 14} L11,${top - 9} Q0,${top - 6} -11,${top - 9} Z`} fill={shade(base, 0.62)} />

        {formal ? (
          <>
            <path d={`M-12,${top - 2} L0,${top + 36} L12,${top - 2} Z`} fill="#efe8da" />
            <path d={`M-3.5,${top + 4} L3.5,${top + 4} L5,${top + 30} L0,${top + 36} L-5,${top + 30} Z`} fill={look.outfit === "kente" ? "#b3243a" : "#2a1f3a"} />
            <path d={`M-4,${top - 1} L4,${top - 1} L3,${top + 5} L-3,${top + 5} Z`} fill={look.outfit === "kente" ? "#8a1a2c" : "#1e1629"} />
            {/* Lapels */}
            <path d={`M-12,${top - 2} L-23,${top + 16} L-14,${top + 20} L-1,${top + 42} Z`} fill={cloth.dark} />
            <path d={`M12,${top - 2} L23,${top + 16} L14,${top + 20} L1,${top + 42} Z`} fill={cloth.dark} />
            <path d={`M-12,${top - 2} L-23,${top + 16}`} stroke={rim} strokeOpacity="0.5" strokeWidth="1" />
            <path d={`M12,${top - 2} L23,${top + 16}`} stroke={rim} strokeOpacity="0.35" strokeWidth="1" />
            {look.outfit !== "kente" && <path d={`M${w * 0.42},${top + 24} l7,0 l-2,-4 l-2,2 l-1,-3 Z`} fill="#efe8da" opacity="0.9" />}
          </>
        ) : look.outfit === "bomber" ? (
          <>
            <path d={`M-14,${top - 1} Q0,${top + 6} 14,${top - 1} L12,${top + 4} Q0,${top + 10} -12,${top + 4} Z`} fill="#2c3a33" />
            <path d={`M0,${top + 6} L0,-56`} stroke="#0a0f0c" strokeWidth="1.4" />
            <path d={`M0,${top + 6} L0,-56`} stroke={rim} strokeOpacity="0.25" strokeWidth="0.6" transform="translate(1 0)" />
            <rect x="2" y={top + 8} width="30" height="7" rx="1.4" fill="#0f1612" />
            <text x="17" y={top + 13.2} textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="3.3" fill="#efe8da" opacity="0.9">
              SECURITY
            </text>
          </>
        ) : (
          <path d={`M-12,${top - 2} L0,${top + 18} L12,${top - 2} Z`} fill="#0c0a10" />
        )}

        {look.outfit === "kente" && (
          <g strokeWidth="2.2">
            <path d={`M-14,${top} L-3,${top + 32}`} stroke="#cfa349" />
            <path d={`M-17,${top + 3} L-6,${top + 34}`} stroke="#2c6e49" />
            <path d={`M14,${top} L3,${top + 32}`} stroke="#cfa349" />
            <path d={`M17,${top + 3} L6,${top + 34}`} stroke="#b3243a" />
          </g>
        )}
        {look.outfit === "hivis" && (
          <g>
            <path
              d={`M${-waist + 3},-52 L${-w + 6},${top + 26} Q${-w + 8},${top + 6} ${-w + 22},${top + 3} L-9,${top + 3} L-6,-52 Z M${waist - 3},-52 L${w - 6},${top + 26} Q${w - 8},${top + 6} ${w - 22},${top + 3} L9,${top + 3} L6,-52 Z`}
              fill="#c8e63a"
            />
            <rect x={-w + 7} y="-88" width={w * 2 - 14} height="3.5" fill="#efe8da" opacity="0.9" />
            <rect x={-waist - 2} y="-70" width={waist * 2 + 4} height="3.5" fill="#efe8da" opacity="0.9" />
          </g>
        )}
        {look.outfit === "irongate" && <path d={`M${-waist - 4},-62 Q0,-56 ${waist + 4},-62`} stroke="#8f6bff" strokeWidth="1.4" fill="none" />}
        {look.extra === "lanyard" && (
          <g>
            <path d={`M-9,${top} L-2,${top + 26} M9,${top} L2,${top + 26}`} stroke="#8f6bff" strokeWidth="1.6" fill="none" />
            <rect x="-6" y={top + 25} width="12" height="9" rx="1.5" fill="#efe8da" />
            <rect x="-4" y={top + 27} width="4" height="5" fill="#6e6875" />
          </g>
        )}
        {look.extra === "flashlight" && (
          <g transform={`translate(${-waist + 6} -54) rotate(10)`}>
            <rect x="-2.5" y="-2" width="5" height="16" rx="1.5" fill="#4a4552" />
            <rect x="-3.5" y="12" width="7" height="4" rx="1" fill="#c9c3cf" />
          </g>
        )}
      </g>

      {/* Head */}
      <g data-part="head" transform={g.head}>
        <g transform="scale(1.07 1)">
        <HeadBack look={look} />
        <ellipse cx="-18" cy="2" rx="4.2" ry="6.5" fill={shade(base, 0.85)} />
        <ellipse cx="18" cy="2" rx="4.2" ry="6.5" fill={shade(base, 0.72)} />
        <path d="M-17,-14 Q-17,-33 0,-33 Q17,-33 17,-14 L17,9 Q15,23 0,25 Q-15,23 -17,9 Z" fill="none" stroke={rim} strokeWidth="2.4" strokeOpacity="0.55" />
        <path d="M-17,-14 Q-17,-33 0,-33 Q17,-33 17,-14 L17,9 Q15,23 0,25 Q-15,23 -17,9 Z" fill={skin} />
        {/* The side away from the sign falls into shadow */}
        <path d="M3,-33 Q17,-33 17,-14 L17,9 Q15,23 0,25 Q9,10 8,-10 Q7,-25 3,-33 Z" fill={shade(base, 0.7)} opacity="0.55" />
        <path d="M-2,-1 L-4.5,8 Q0,10.5 4.5,8 L2,-1 Z" fill={shade(base, 0.74)} />
        <path d="M-4.5,8 Q0,10.5 4.5,8" stroke={shade(base, 0.5)} strokeWidth="0.8" fill="none" />
        <path d="M-6.5,15.5 Q0,14 6.5,15.5" stroke="#2a1810" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M-9,21 Q0,25 9,21" stroke={shade(base, 0.6)} strokeWidth="1" fill="none" opacity="0.7" />
        <HeadTop look={look} base={base} rim={rim} />
        <Eyes look={look} rim={rim} />
        {look.extra === "toothpick" && <path d="M5,15 L15,12" stroke="#e8d3a6" strokeWidth="1.4" strokeLinecap="round" />}
        {look.earpiece && <path d="M19,6 q4,10 -2,18 q-6,8 0,20" stroke="#efe8da" strokeOpacity="0.75" strokeWidth="1" fill="none" />}
        </g>
      </g>

      {arm("L", g.armL)}
      {arm("R", g.armR)}

      <g data-part="board" transform={g.board}>{holds === "ledger" ? <Ledger /> : <Clipboard />}</g>
      {foreFront("L", g.armL, poseOf(pose).lShape)}
      {foreFront("R", g.armR, poseOf(pose).rShape)}

      <g data-part="handL" transform={g.handL}>
        <Hands skin={skin} base={base} initial={poseOf(pose).lShape} />
      </g>
      <g data-part="handR" transform={g.handR}>
        <Hands skin={skin} base={base} initial={poseOf(pose).rShape} />
      </g>
    </g>
  );
}

function Clipboard() {
  return (
    <g>
      <rect x="-13" y="-15.5" width="28" height="36" rx="2.5" fill="#000" opacity="0.35" />
      <rect x="-14" y="-18" width="28" height="36" rx="2.5" fill="#7a5634" />
      <rect x="-14" y="-18" width="28" height="36" rx="2.5" fill="none" stroke="#a37a4d" strokeWidth="0.8" />
      <rect x="-11.5" y="-14" width="23" height="30" rx="0.8" fill="#efe8da" />
      <g strokeWidth="0.9">
        {[-8, -3, 2, 7, 12].map((yy, i) => (
          <g key={yy}>
            <rect x="-9.5" y={yy - 1.6} width="3.2" height="3.2" fill="none" stroke="#6e6875" />
            <line x1="-4.5" x2={i % 2 ? 6 : 9} y1={yy} y2={yy} stroke="#6e6875" />
            {i === 1 && <line x1="-5" x2="8" y1={yy} y2={yy} stroke="#b3243a" strokeWidth="1.1" />}
            {i < 3 && i !== 1 && <path d={`M-9,${yy} l1,1.2 l2,-2.6`} stroke="#8f6bff" fill="none" />}
          </g>
        ))}
      </g>
      <rect x="-6.5" y="-21" width="13" height="6.5" rx="1.5" fill="#bdb6c4" />
      <rect x="-4" y="-19.5" width="8" height="2.5" rx="1" fill="#6e6875" />
      <circle cx="0" cy="-15.5" r="1" fill="#6e6875" />
    </g>
  );
}

function Ledger() {
  return (
    <g>
      <rect x="-13" y="-15.5" width="28" height="36" rx="2" fill="#000" opacity="0.35" />
      <rect x="-14" y="-18" width="28" height="36" rx="2" fill="#2a1f3a" />
      <rect x="11" y="-17" width="3" height="34" fill="#efe8da" opacity="0.85" />
      <rect x="-14" y="-18" width="4" height="36" rx="1.5" fill="#1a1325" />
      <path d="M14,-18 l-5,0 l5,5 Z M14,18 l-5,0 l5,-5 Z" fill="#cfa349" />
      <rect x="-7" y="-8" width="15" height="7" rx="1" fill="none" stroke="#cfa349" strokeWidth="0.7" />
      <text x="0.5" y="-3" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="3.6" fill="#cfa349">
        LEDGER
      </text>
    </g>
  );
}

/** All hand shapes are drawn once; the rig shows the one in use. Canonical: a right hand. */
function Hands({ skin, base, initial }: { skin: string; base: string; initial: string }) {
  const dark = shade(base, 0.66);
  const line = shade(base, 0.5);
  const show = (s: string) => (s === initial ? undefined : { display: "none" });
  return (
    <>
      {/* Gripping the board's edge: back of the hand outside, four fingers curled over the front */}
      <g data-shape="grip" style={show("grip")}>
        <rect x="-1.5" y="-7.5" width="9" height="15" rx="4.5" fill={dark} />
        {[-5.4, -1.8, 1.8, 5.4].map((yy) => (
          <rect key={yy} x="-5.5" y={yy - 1.9} width="8" height="3.8" rx="1.9" fill={skin} stroke={line} strokeWidth="0.5" />
        ))}
      </g>
      {/* A fist with a pen */}
      <g data-shape="pen" style={show("pen")}>
        <line x1="-2" y1="3" x2="-10" y2="12" stroke="#17141c" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="-10" y1="12" x2="-11.6" y2="13.9" stroke="#c9c3cf" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="-6" y="-6.5" width="12.5" height="11.5" rx="5" fill={skin} />
        <path d="M-4.5,-2 h9 M-4.5,1.5 h8" stroke={line} strokeWidth="0.6" />
        <ellipse cx="-4.5" cy="2" rx="2.8" ry="2.1" fill={skin} stroke={line} strokeWidth="0.5" />
      </g>
      {/* Flat palm to the guest: stop */}
      <g data-shape="palm" style={show("palm")}>
        <g transform="translate(0 -7)">
          {[
            [-5.6, -16],
            [-2.3, -18.5],
            [1, -18],
            [4.3, -15],
          ].map(([xx, yy]) => (
            <rect key={xx} x={xx} y={yy} width="3.1" height={-yy - 2} rx="1.55" fill={skin} stroke={line} strokeWidth="0.45" />
          ))}
          <rect x="-12" y="-6" width="3.4" height="10" rx="1.7" fill={skin} stroke={line} strokeWidth="0.45" transform="rotate(-38 -10 -1)" />
          <rect x="-6.5" y="-6" width="14" height="13" rx="4.5" fill={skin} />
          <path d="M-3,1 q3,2 6,0" stroke={line} strokeWidth="0.6" fill="none" />
        </g>
      </g>
      {/* Open hand, palm up, fingers along the arm: "come in" */}
      <g data-shape="open" style={show("open")}>
        <rect x="-1" y="-5" width="11" height="9.5" rx="4" fill={skin} />
        <rect x="7" y="-4.5" width="10.5" height="7.5" rx="3.6" fill={skin} stroke={line} strokeWidth="0.45" />
        <path d="M9,-1.6 h7.5 M9,1 h7" stroke={line} strokeWidth="0.5" />
        <rect x="3" y="-9" width="7.5" height="3.6" rx="1.8" fill={skin} stroke={line} strokeWidth="0.45" transform="rotate(-24 3 -7)" />
      </g>
      {/* A mug of tea */}
      <g data-shape="mug" style={show("mug")}>
        <path className="steam" d="M3,-15 q2.5,-4 0,-8 M7.5,-15 q2.5,-4 0,-8" stroke="#efe8da" strokeOpacity="0.55" strokeWidth="1" fill="none" />
        <rect x="-6" y="-12" width="6.5" height="12" rx="3" fill={dark} />
        <path d="M10.5,-11 h2.5 a3,3 0 0 1 0,7 h-2.5" stroke="#d9cfbd" strokeWidth="2" fill="none" />
        <rect x="-0.5" y="-13.5" width="11.5" height="13.5" rx="2" fill="#efe8da" />
        <rect x="-0.5" y="-9" width="11.5" height="2.6" fill="#b3243a" />
        {[-11, -7.6, -4.2].map((yy) => (
          <rect key={yy} x="-3" y={yy} width="6.5" height="3.3" rx="1.6" fill={skin} stroke={line} strokeWidth="0.45" />
        ))}
      </g>
    </>
  );
}

function HeadBack({ look }: { look: Look }) {
  if (look.head === "afro") {
    return (
      <g>
        <ellipse cx="0" cy="-19" rx="28" ry="25" fill={look.headColor} />
        <path d="M-27,-26 Q-22,-44 0,-44" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2" fill="none" />
        <g fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1">
          {[-14, -4, 6, 16].map((xx) => (
            <path key={xx} d={`M${xx - 4},-32 q4,-3 8,0`} />
          ))}
        </g>
      </g>
    );
  }
  if (look.head !== "braids") return null;
  return (
    <g stroke={look.headColor} strokeWidth="3.4" strokeLinecap="round" fill="none">
      <path d="M-15,-2 Q-20,14 -18,32" />
      <path d="M-11,0 Q-14,16 -12,34" />
      <path d="M15,-2 Q20,14 18,32" />
      <path d="M11,0 Q14,16 12,34" />
    </g>
  );
}

function HeadTop({ look, base, rim }: { look: Look; base: string; rim: string }) {
  const c = look.headColor;
  switch (look.head) {
    case "bald":
      return (
        <g>
          <path d="M-11,-28 Q0,-34 11,-28" stroke={shade(base, 1.6)} strokeWidth="2.2" fill="none" opacity="0.55" />
          <path d="M-15,-20 Q-14,-31 -4,-33" stroke={rim} strokeWidth="1.4" fill="none" opacity="0.5" />
        </g>
      );
    case "lowcut":
      return <path d="M-17,-12 Q-18,-35 0,-35 Q18,-35 17,-12 Q12,-22 0,-23 Q-12,-22 -17,-12 Z" fill={c} opacity="0.95" />;
    case "afro":
      return <path d="M-17,-11 Q-16,-31 0,-31 Q16,-31 17,-11 Q10,-20 0,-21 Q-10,-20 -17,-11 Z" fill={c} />;
    case "braids":
      return (
        <g>
          <path d="M-17,-10 Q-18,-35 0,-35 Q18,-35 17,-10 Q12,-20 0,-21 Q-12,-20 -17,-10 Z" fill={c} />
          <g stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.8" fill="none">
            {[-9, -3, 3, 9].map((xx) => (
              <path key={xx} d={`M${xx},-33 Q${xx * 1.2},-25 ${xx * 1.5},-14`} />
            ))}
          </g>
        </g>
      );
    case "duku":
      return (
        <g>
          <path d="M-19,-9 Q-23,-37 0,-41 Q25,-39 20,-9 Q10,-18 0,-17 Q-10,-18 -19,-9 Z" fill={c} />
          <path d="M8,-39 Q24,-48 26,-30 Q19,-35 12,-31 Z" fill={shade(c, 0.72)} />
          <path d="M-19,-9 Q-23,-37 0,-41" stroke={rim} strokeOpacity="0.45" strokeWidth="1.2" fill="none" />
          <g fill="#efe8da" opacity="0.6">
            {[
              [-8, -29],
              [0, -33],
              [8, -29],
              [-4, -22],
              [5, -22],
              [-13, -20],
              [13, -20],
            ].map(([xx, yy]) => (
              <circle key={`${xx}${yy}`} cx={xx} cy={yy} r="1.3" />
            ))}
          </g>
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M-17,-14 Q-17,-37 0,-37 Q17,-37 17,-14 Z" fill={c} />
          <path d="M-4,-15 Q16,-19 31,-12 Q16,-10 -4,-12 Z" fill={shade(c, 0.7)} />
          <text x="-2" y="-21" textAnchor="middle" fontFamily="var(--font-bungee)" fontSize="6" fill="#efe8da">
            SEC
          </text>
        </g>
      );
    case "beanie":
      return (
        <g>
          <path d="M-18,-12 Q-19,-41 0,-41 Q19,-41 18,-12 Z" fill={c} />
          <rect x="-19" y="-17" width="38" height="7" rx="3" fill={shade(c, 0.8)} />
          <path d="M-18,-12 Q-19,-41 0,-41" stroke={rim} strokeOpacity="0.4" strokeWidth="1.2" fill="none" />
        </g>
      );
  }
}

function Eyes({ look, rim }: { look: Look; rim: string }) {
  if (look.eyewear === "shades") {
    return (
      <>
        <path d="M-17,-7 L17,-7 L16,2 Q10,6.5 3,3.5 L0,0.5 L-3,3.5 Q-10,6.5 -16,2 Z" fill="#06040a" />
        <path d="M-17,-7 L17,-7" stroke={rim} strokeOpacity="0.5" strokeWidth="0.8" />
        <path d="M-13,-5 L-8,1 M8,-5 L11,-1" stroke={rim} strokeOpacity="0.25" strokeWidth="1.6" />
        <line className="glint" x1="-12" y1="-3.5" x2="-6" y2="-3.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
      </>
    );
  }
  return (
    <>
      <path d="M-12,-8 L-4,-9 M4,-9 L12,-8" stroke="#1a0f0a" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="-7.5" cy="-2.5" rx="2.6" ry="1.8" fill="#efe8da" opacity="0.9" />
      <ellipse cx="7.5" cy="-2.5" rx="2.6" ry="1.8" fill="#efe8da" opacity="0.9" />
      <circle cx="-7" cy="-2.5" r="1.4" fill="#1a0f0a" />
      <circle cx="8" cy="-2.5" r="1.4" fill="#1a0f0a" />
      <path d="M-10.5,-4.2 h6 M4.5,-4.2 h6" stroke="#1a0f0a" strokeWidth="0.9" opacity="0.6" />
      {look.eyewear === "readers" ? (
        <>
          <g fill="none" stroke="#e9c46a" strokeWidth="1.1">
            <rect x="-12.5" y="-6.5" width="10" height="7.5" rx="3" />
            <rect x="2.5" y="-6.5" width="10" height="7.5" rx="3" />
            <path d="M-2.5,-3.5 L2.5,-3.5" />
            <path d="M-12.5,-2.5 Q-19,12 -9,24" strokeOpacity="0.5" />
          </g>
          <line className="glint" x1="-11" y1="-4.5" x2="-6" y2="-4.5" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0" />
        </>
      ) : null}
    </>
  );
}
