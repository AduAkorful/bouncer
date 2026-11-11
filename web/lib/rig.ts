// A bouncer's arms are a two-bone rig: shoulder → elbow → hand. Hands can hold on to a point on the
// clipboard, so wherever the board goes the fingers go with it. Pure geometry; safe on the server.
import type { Build } from "./look";

export type HandShape = "grip" | "pen" | "palm" | "open";

export interface RigState {
  /** Clipboard centre and angle, body coordinates (feet at 0,0) */
  bx: number;
  by: number;
  br: number;
  /** How much each hand holds the board (1) versus reaching for its free target (0) */
  la: number;
  ra: number;
  /** Where on the board each hand holds, board coordinates */
  lu: number;
  lv: number;
  ru: number;
  rv: number;
  /** Free targets */
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  /** Head tilt (degrees) and drop */
  hr: number;
  hy: number;
  /** Breathing: lifts chest, shoulders, head and board together */
  lift: number;
  /** Idle glance, added to the head tilt so it never fights a pose */
  gl: number;
  lShape: HandShape;
  rShape: HandShape;
}

export type PoseName = "idle" | "read" | "refuse" | "aside";

const BOARD = { hw: 14, hh: 18 };

const base: RigState = {
  bx: 0,
  by: -76,
  br: -6,
  la: 1,
  ra: 1,
  lu: -BOARD.hw,
  lv: -2,
  ru: BOARD.hw,
  rv: -5,
  lx: -40,
  ly: -60,
  rx: 40,
  ry: -60,
  hr: 0,
  hy: 0,
  lift: 0,
  gl: 0,
  lShape: "grip",
  rShape: "grip",
};

/** Poses are written for the broad build; x positions scale with shoulder width. */
export const POSES: Record<PoseName, Omit<RigState, "lift" | "gl">> = {
  // Board held in front of the belt with both hands on its edges.
  idle: { ...base },
  // Board up to the chest, head down to it, pen running down the list.
  read: { ...base, bx: -6, by: -104, br: -12, ru: 1, rv: -2, rShape: "pen", hr: 9, hy: 2 },
  // Board drops to one hand; the other comes up flat: stop.
  refuse: { ...base, bx: -10, by: -72, br: -2, ra: 0, rx: 64, ry: -166, rShape: "palm", hr: -4, hy: -1 },
  // Stepped aside: board tucked under the right arm, left arm sweeps the guest in.
  aside: { ...base, bx: 30, by: -86, br: 10, la: 0, lx: -88, ly: -96, lShape: "open", ru: 6, rv: 16, hr: -7 },
};

export function pose(name: PoseName, lift = 0): RigState {
  return { ...POSES[name], lift, gl: 0 };
}

export interface Dims {
  /** Half shoulder width */
  w: number;
  /** Top of the jacket (y) */
  top: number;
  upper: number;
  fore: number;
  /** Stroke widths of upper arm and forearm */
  uw: number;
  fw: number;
  /** Hand scale */
  k: number;
}

export function dims(build: Build): Dims {
  switch (build) {
    case "broad":
      return { w: 52, top: -126, upper: 38, fore: 33, uw: 20, fw: 18, k: 1.05 };
    case "stocky":
      return { w: 47, top: -118, upper: 34, fore: 31, uw: 18, fw: 16.5, k: 1 };
    case "wiry":
      return { w: 40, top: -126, upper: 37, fore: 32, uw: 14, fw: 13, k: 0.9 };
  }
}

export interface ArmGeom {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  hx: number;
  hy: number;
  /** Forearm direction, degrees */
  fa: number;
}

export interface RigGeom {
  armL: ArmGeom;
  armR: ArmGeom;
  board: string;
  handL: string;
  handR: string;
  head: string;
  torso: string;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function onBoard(s: RigState, u: number, v: number): [number, number] {
  const a = rad(s.br);
  return [s.bx + u * Math.cos(a) - v * Math.sin(a), s.by + s.lift + u * Math.sin(a) + v * Math.cos(a)];
}

/** Two-bone solve; the elbow takes whichever side points most along `pref`. */
function solveArm(sx: number, sy: number, tx: number, ty: number, l1: number, l2: number, pref: [number, number]): ArmGeom {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy) || 0.001;
  const reach = l1 + l2 - 0.5;
  if (d > reach) {
    tx = sx + (dx / d) * reach;
    ty = sy + (dy / d) * reach;
    dx = tx - sx;
    dy = ty - sy;
    d = reach;
  }
  const a = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const pick = [a + off, a - off]
    .map((t) => [sx + l1 * Math.cos(t), sy + l1 * Math.sin(t)] as const)
    .sort((p, q) => (q[0] - sx) * pref[0] + (q[1] - sy) * pref[1] - ((p[0] - sx) * pref[0] + (p[1] - sy) * pref[1]))[0]!;
  const [ex, ey] = pick;
  // Rounded so server and client render identical numbers (their trig can differ in the last digit).
  const r = (v: number) => Math.round(v * 100) / 100;
  return { sx: r(sx), sy: r(sy), ex: r(ex), ey: r(ey), hx: r(tx), hy: r(ty), fa: r(deg(Math.atan2(ty - ey, tx - ex))) };
}

/** Which way each hand shape faces: with the board, along the forearm, or upright. */
function handAngle(shape: HandShape, s: RigState, arm: ArmGeom, side: -1 | 1) {
  switch (shape) {
    case "grip":
      return s.br;
    case "open":
      return side === 1 ? arm.fa : arm.fa - 180;
    case "pen":
      return -10 * side;
    default:
      return 0;
  }
}

export function solve(d: Dims, s: RigState): RigGeom {
  const kx = d.w / 52;
  const sh = d.w - 10;
  const sy = d.top + 14 + s.lift;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const [lbx, lby] = onBoard({ ...s, bx: s.bx * kx }, s.lu, s.lv);
  const [rbx, rby] = onBoard({ ...s, bx: s.bx * kx }, s.ru, s.rv);
  const armL = solveArm(-sh, sy, lerp(s.lx * kx, lbx, s.la), lerp(s.ly + s.lift, lby, s.la), d.upper, d.fore, [-0.55, 0.85]);
  const armR = solveArm(sh, sy, lerp(s.rx * kx, rbx, s.ra), lerp(s.ry + s.lift, rby, s.ra), d.upper, d.fore, [0.55, 0.85]);
  const hand = (arm: ArmGeom, shape: HandShape, side: -1 | 1) =>
    `translate(${arm.hx.toFixed(2)} ${arm.hy.toFixed(2)}) rotate(${handAngle(shape, s, arm, side).toFixed(2)}) scale(${side * d.k} ${d.k})`;
  return {
    armL,
    armR,
    board: `translate(${(s.bx * kx).toFixed(2)} ${(s.by + s.lift).toFixed(2)}) rotate(${s.br.toFixed(2)})`,
    handL: hand(armL, s.lShape, -1),
    handR: hand(armR, s.rShape, 1),
    head: `translate(0 ${(d.top - 24 + s.hy + s.lift).toFixed(2)}) rotate(${(s.hr + s.gl).toFixed(2)} 0 22)`,
    torso: `translate(0 ${(s.lift * 0.7).toFixed(2)})`,
  };
}

/** The shirt cuff sits on the last stretch of the forearm. */
export function cuffPoints(a: { ex: number; ey: number; hx: number; hy: number }) {
  const len = Math.hypot(a.hx - a.ex, a.hy - a.ey) || 1;
  const ux = (a.hx - a.ex) / len;
  const uy = (a.hy - a.ey) / len;
  return [a.hx - ux * 7, a.hy - uy * 7, a.hx - ux * 3.5, a.hy - uy * 3.5] as const;
}
