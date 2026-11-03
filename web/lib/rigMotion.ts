// Drives a rendered <Bouncer> through its poses. Every frame re-solves the arms, so hands stay on the board.
import gsap from "gsap";
import { cuffPoints, dims, pose, solve, type Dims, type HandShape, type PoseName, type RigState } from "./rig";
import type { Build } from "./look";

interface Rig {
  el: SVGGElement;
  d: Dims;
  s: RigState;
  apply: () => void;
}

const rigs = new WeakMap<Element, Rig>();

function line(el: Element | null, x1: number, y1: number, x2: number, y2: number) {
  if (!el) return;
  el.setAttribute("x1", x1.toFixed(2));
  el.setAttribute("y1", y1.toFixed(2));
  el.setAttribute("x2", x2.toFixed(2));
  el.setAttribute("y2", y2.toFixed(2));
}

function showShape(hand: Element | null, shape: HandShape) {
  hand?.querySelectorAll<SVGGElement>("[data-shape]").forEach((g) => {
    g.style.display = g.dataset.shape === shape ? "" : "none";
  });
}

/** The rig for the bouncer inside `scope` (or the element itself). */
export function getRig(scope: Element | null | undefined): Rig | null {
  const el = (scope?.matches?.("[data-rig]") ? scope : scope?.querySelector("[data-rig]")) as SVGGElement | null;
  if (!el) return null;
  const known = rigs.get(el);
  if (known) return known;
  const d = dims(el.dataset.build as Build);
  const s = pose(el.dataset.pose as PoseName);
  const q = (part: string) => el.querySelector(`[data-part="${part}"]`);
  const parts = {
    lu: el.querySelectorAll(`[data-part="armL-up"]`),
    lf: el.querySelectorAll(`[data-part="armL-fore"]`),
    ru: el.querySelectorAll(`[data-part="armR-up"]`),
    rf: el.querySelectorAll(`[data-part="armR-fore"]`),
    lc: el.querySelectorAll(`[data-part="cuffL"]`),
    rc: el.querySelectorAll(`[data-part="cuffR"]`),
    lfront: el.querySelector<SVGGElement>(`[data-front="L"]`),
    rfront: el.querySelector<SVGGElement>(`[data-front="R"]`),
    board: q("board"),
    hl: q("handL"),
    hr: q("handR"),
    head: q("head"),
    torso: q("torso"),
  };
  let shapes = `${s.lShape}/${s.rShape}`;
  const apply = () => {
    const g = solve(d, s);
    parts.lu.forEach((n) => line(n, g.armL.sx, g.armL.sy, g.armL.ex, g.armL.ey));
    parts.lf.forEach((n) => line(n, g.armL.ex, g.armL.ey, g.armL.hx, g.armL.hy));
    parts.ru.forEach((n) => line(n, g.armR.sx, g.armR.sy, g.armR.ex, g.armR.ey));
    parts.rf.forEach((n) => line(n, g.armR.ex, g.armR.ey, g.armR.hx, g.armR.hy));
    parts.lc.forEach((n) => cuff(n, g.armL));
    parts.rc.forEach((n) => cuff(n, g.armR));
    parts.board?.setAttribute("transform", g.board);
    parts.hl?.setAttribute("transform", g.handL);
    parts.hr?.setAttribute("transform", g.handR);
    parts.head?.setAttribute("transform", g.head);
    parts.torso?.setAttribute("transform", g.torso);
    const now = `${s.lShape}/${s.rShape}`;
    if (now !== shapes) {
      shapes = now;
      showShape(parts.hl, s.lShape);
      showShape(parts.hr, s.rShape);
      // A hand off the board's edge brings its forearm in front of the board with it.
      if (parts.lfront) parts.lfront.style.display = s.lShape === "grip" ? "none" : "";
      if (parts.rfront) parts.rfront.style.display = s.rShape === "grip" ? "none" : "";
    }
  };
  const rig = { el, d, s, apply };
  rigs.set(el, rig);
  return rig;
}

function cuff(el: Element | null, a: { ex: number; ey: number; hx: number; hy: number }) {
  if (!el) return;
  const [x1, y1, x2, y2] = cuffPoints(a);
  line(el, x1, y1, x2, y2);
}

/** Tween the bouncer to a named pose. Hand shapes swap a third of the way in, mid-motion, where the eye can't catch it. */
export function rigTo(scope: Element | null | undefined, name: PoseName, duration = 0.4, ease = "power2.inOut") {
  const rig = getRig(scope);
  if (!rig) return null;
  const { lShape, rShape, lift: _l, gl: _g, ...target } = pose(name);
  let swapped = false;
  return gsap.to(rig.s, {
    ...target,
    duration,
    ease,
    // A scribble on the same hand must not keep running after the pose has moved on.
    overwrite: "auto",
    onUpdate() {
      if (!swapped && this.progress() > 0.33) {
        swapped = true;
        rig.s.lShape = lShape;
        rig.s.rShape = rShape;
      }
      rig.apply();
    },
    onComplete() {
      rig.s.lShape = lShape;
      rig.s.rShape = rShape;
      rig.apply();
    },
  });
}

/** Tween any rig values directly (the pen scribbling, a glance). */
export function rigTween(scope: Element | null | undefined, vars: gsap.TweenVars) {
  const rig = getRig(scope);
  if (!rig) return null;
  return gsap.to(rig.s, { ...vars, overwrite: false, onUpdate: rig.apply });
}

/** Idle life: a slow breath and the occasional glance down the queue. */
export function rigIdle(scope: Element | null | undefined) {
  const rig = getRig(scope);
  if (!rig) return [];
  return [
    gsap.to(rig.s, { lift: -1.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: rig.apply }),
    gsap
      .timeline({ repeat: -1, repeatDelay: 4.5, delay: 2 })
      .to(rig.s, { gl: -6, duration: 0.5, ease: "power2.inOut", onUpdate: rig.apply })
      .to(rig.s, { gl: 0, duration: 0.6, ease: "power2.inOut", onUpdate: rig.apply }, "+=1.4"),
  ];
}
