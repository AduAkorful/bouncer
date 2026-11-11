// Idle life shared by every scene: nothing here carries meaning, it just keeps the street breathing.
import gsap from "gsap";
import { rigIdle } from "./rigMotion";

export function startIdle(root: Element) {
  const has = (sel: string) => root.querySelector(sel) !== null;
  root.querySelectorAll("[data-rig]").forEach((el) => rigIdle(el));
  if (has(".queue-person")) gsap.to(root.querySelectorAll(".queue-person"), { y: "-=2", duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.35 });
  if (has(".gossip-hint")) gsap.to(root.querySelectorAll(".gossip-hint"), { y: "-=4", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.2 });
  // The sign stutters now and then, and the light it throws on the street stutters with it.
  if (has("[data-part=sign]")) gsap.timeline({ repeat: -1, repeatDelay: 6 }).to(root.querySelectorAll("[data-part=sign], [data-part=neon-spill]"), { opacity: 0.3, duration: 0.05, yoyo: true, repeat: 3 });
  if (has(".mote")) gsap.to(root.querySelectorAll(".mote"), { y: "+=12", x: "+=3", opacity: 0.12, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.5, from: "random" } });
  if (has("[data-part=headlights]"))
    gsap
      .timeline({ repeat: -1, repeatDelay: 9, delay: 3 })
      .fromTo(root.querySelectorAll("[data-part=headlights]"), { x: -80, opacity: 0 }, { x: 440, opacity: 1, duration: 2.4, ease: "power1.inOut" })
      .to(root.querySelectorAll("[data-part=headlights]"), { opacity: 0, duration: 0.4 }, "-=0.4");
  if (has(".glint"))
    gsap.timeline({ repeat: -1, repeatDelay: 3.5 }).fromTo(root.querySelectorAll(".glint"), { x: -3, opacity: 0 }, { x: 14, opacity: 0.9, duration: 0.45, ease: "sine.inOut" }).to(root.querySelectorAll(".glint"), { opacity: 0, duration: 0.2 });
  // Bulbs chase round the door frame.
  if (has(".bulb")) gsap.to(root.querySelectorAll(".bulb"), { opacity: 0.45, duration: 0.7, stagger: { each: 0.12, repeat: -1, yoyo: true } });
  if (has(".dancer")) gsap.to(root.querySelectorAll(".dancer"), { y: -1.6, duration: 0.254, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.12 });
  if (has(".porthole")) gsap.to(root.querySelectorAll(".porthole"), { opacity: 0.55, duration: 1.0, ease: "steps(4)", yoyo: true, repeat: -1 });
  if (has(".steam")) gsap.fromTo(root.querySelectorAll(".steam"), { y: 2, opacity: 0.1 }, { y: -4, opacity: 0.7, duration: 1.6, ease: "sine.out", repeat: -1, yoyo: true });
  if (has(".phone")) gsap.to(root.querySelectorAll(".phone"), { opacity: 0.12, duration: 0.6, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 1.5 });
  if (has(".pole-stripes")) gsap.fromTo(root.querySelectorAll(".pole-stripes"), { y: 0 }, { y: -16, duration: 1.4, ease: "none", repeat: -1 });
  if (has(".ripple")) gsap.fromTo(root.querySelectorAll(".ripple"), { attr: { rx: 1 }, opacity: 0.8 }, { attr: { rx: 6 }, opacity: 0, duration: 0.5, repeat: -1, ease: "power1.out" });
  if (has(".clue-ring")) gsap.fromTo(root.querySelectorAll(".clue-ring"), { scale: 0.7, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 1.4, ease: "power1.out", repeat: -1, stagger: 0.5 });
  // The street around the queue.
  const all = (sel: string) => root.querySelectorAll(sel);
  if (has(".goer-idle")) gsap.to(all(".goer-idle"), { y: -1.2, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.37, from: "random" } });
  if (has(".goer-bob")) gsap.to(all(".goer-bob"), { y: -3, rotation: 2, transformOrigin: "50% 100%", duration: 0.254, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.13 });
  // Arms swing about the shoulder (see Swing in Goer.tsx). Each person keeps their own timing; the three
  // copies that make up one person (rim and shaded colour) move together.
  const swing = (sel: string, from: number, to: number, dur: number, gap = 0) =>
    root.querySelectorAll(".goer").forEach((g, i) => {
      const parts = g.querySelectorAll(sel);
      if (parts.length)
        gsap.fromTo(parts, { attr: { transform: `rotate(${from})` } }, { attr: { transform: `rotate(${to})` }, duration: dur, ease: "sine.inOut", yoyo: true, repeat: -1, repeatDelay: gap, delay: (i * 0.17) % 0.5 });
    });
  swing(".swing-l", 14, -12, 0.508);
  swing(".swing-r", -14, 12, 0.508);
  swing(".swing-gesture", -14, 16, 0.45, 0.4);
  if (has(".goer-nod")) gsap.to(all(".goer-nod"), { rotation: 1.5, transformOrigin: "50% 100%", duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
  if (has(".selfie-flash"))
    gsap.timeline({ repeat: -1, repeatDelay: 4.5, delay: 2 }).to(all(".selfie-flash"), { opacity: 0.95, duration: 0.04 }).to(all(".selfie-flash"), { opacity: 0, duration: 0.35 });
  if (has(".smoke"))
    gsap.fromTo(all(".smoke"), { y: 0, x: 0, opacity: 0.25, scale: 0.8 }, { y: -46, x: 10, opacity: 0, scale: 1.8, transformOrigin: "50% 50%", duration: 2.6, ease: "power1.out", repeat: -1, stagger: 0.42 });
  if (has(".coals")) gsap.to(all(".coals"), { opacity: 0.6, duration: 0.18, ease: "steps(3)", yoyo: true, repeat: -1, repeatDelay: 0.3 });
  if (has(".exhaust")) gsap.fromTo(all(".exhaust"), { x: 0, opacity: 0.5, scale: 0.6 }, { x: 22, y: -6, opacity: 0, scale: 2, transformOrigin: "50% 50%", duration: 1.4, repeat: -1, stagger: 0.45 });
  if (has(".wander")) gsap.to(all(".wander"), { x: 46, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
  if (has(".open-sign")) gsap.timeline({ repeat: -1, repeatDelay: 5 }).to(all(".open-sign"), { opacity: 0.2, duration: 0.06, yoyo: true, repeat: 3 });
  if (has(".laser")) gsap.fromTo(all(".laser"), { rotation: -22 }, { rotation: 22, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.6 });
  if (has(".tube")) gsap.timeline({ repeat: -1, repeatDelay: 7 }).to(all(".tube"), { opacity: 0.15, duration: 0.05, yoyo: true, repeat: 5, ease: "steps(1)" });
  if (has(".tv")) gsap.to(all(".tv"), { opacity: 0.22, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.7 });
  if (has(".cam")) gsap.fromTo(all(".cam"), { rotation: -18 }, { rotation: 22, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1 });
  if (has(".led")) gsap.to(all(".led"), { opacity: 0.1, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1 });
  if (has(".bulb-warm")) gsap.to(all(".bulb-warm"), { opacity: 0.75, duration: 0.12, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 2.2 });
  all(".wisp").forEach((el, i) => {
    const dir = Number((el as SVGElement).dataset.dir ?? 1);
    gsap.fromTo(el, { x: 0, opacity: 0.3, scaleX: 0.6 }, { x: dir * 40, y: 2, opacity: 0, scaleX: 2.2, transformOrigin: "50% 50%", duration: 3.2, ease: "sine.out", repeat: -1, delay: i * 0.6 });
  });
  if (has("[data-part=okada]")) {
    const kind = root.querySelector("[data-part=okada]")?.getAttribute("data-sound");
    const bus = kind === "bus";
    gsap
      .timeline({ repeat: -1, repeatDelay: bus ? 20 : 12, delay: 6 })
      .fromTo(all("[data-part=okada]"), { x: 1000 }, { x: -700, duration: bus ? 3.4 : 3.6, ease: "none" });
  }
  if (has(".snow")) gsap.fromTo(all(".snow"), { y: -60 }, { y: 300, x: "+=12", duration: 7, ease: "none", repeat: -1, stagger: { each: 0.1, repeat: -1 } });
  if (has(".fog")) gsap.to(all(".fog"), { x: 60, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 1.5 });
  if (has(".firework")) gsap.fromTo(all(".firework"), { scale: 0.2, opacity: 1 }, { scale: 1.3, opacity: 0, duration: 1.8, ease: "power2.out", repeat: -1, stagger: 0.7, repeatDelay: 1.2 });
  if (has(".star")) gsap.to(all(".star"), { opacity: 0.15, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.08, from: "random" } });
  if (has(".rain")) gsap.fromTo(all(".rain"), { y: -40 }, { y: 300, duration: 0.9, ease: "none", repeat: -1, stagger: { each: 0.013, repeat: -1 } });
  if (has(".doner")) gsap.to(all(".doner"), { opacity: 0.15, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
  if (has(".learn-badge")) gsap.to(all(".learn-badge"), { scale: 1.15, transformOrigin: "50% 50%", duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
  if (has(".lamp-sway")) gsap.to(root.querySelectorAll(".lamp-sway"), { rotation: 1.5, transformOrigin: "50% 0%", duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
}

/** The light around the door breathes with the bass behind it; puddles shiver, the VIP strobe fires. Returns an unsubscribe. */
export function beatGlow(root: Element, selector = "[data-part=door-glow]") {
  // The app pulses this on the music beat. The prototype is silent, so the same pulse runs on a fixed clock.
  let accent = false;
  const tick = () => {
    accent = !accent;
    const el = root.querySelectorAll(selector);
    if (el.length) gsap.fromTo(el, { opacity: accent ? 1 : 0.9 }, { opacity: 0.55, duration: 0.45, ease: "power2.out" });
    const rings = root.querySelectorAll(".puddle-ring");
    if (rings.length) gsap.fromTo(rings, { attr: { rx: 2 }, opacity: 0.7 }, { attr: { rx: 14 }, opacity: 0, duration: 0.5, ease: "power1.out" });
    const strobe = root.querySelectorAll(".strobe");
    if (strobe.length && accent) gsap.fromTo(strobe, { opacity: 0.55 }, { opacity: 0, duration: 0.18, stagger: 0.06 });
  };
  const tween = gsap.to({}, { duration: 0.9, repeat: -1, onRepeat: tick });
  return () => tween.kill();
}

/** On a mouse, the street in front drifts against the pointer so the scene has depth. Returns a cleanup. */
export function parallax(root: HTMLElement) {
  if (!window.matchMedia("(pointer: fine)").matches) return () => {};
  const near = root.querySelectorAll("[data-part=near]");
  if (!near.length) return () => {};
  const qx = gsap.quickTo(near, "x", { duration: 0.8, ease: "power3.out" });
  const move = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    qx(((e.clientX - r.left) / r.width - 0.5) * -14);
  };
  root.addEventListener("pointermove", move);
  return () => root.removeEventListener("pointermove", move);
}
