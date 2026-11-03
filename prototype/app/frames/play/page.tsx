"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Countdown } from "@/components/Countdown";
import { DemoBadge, Money, usd } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { OfficeScene } from "@/components/OfficeScene";
import { BillBuilder } from "@/components/play/BillBuilder";
import { Desk, type Note } from "@/components/play/Desk";
import { ApprovedStamp, RefusedStamp } from "@/components/Stamp";
import { checkBill, guardReply, type DraftBill } from "@/lib/demo/guard";
import {
  bossNight,
  doorClues,
  doorLedger,
  officeClues,
  officeGossip,
  officeLedger,
  payout,
  queueGossip,
  raid,
  streak,
  ticker,
  today,
  venue,
  verdict,
  type Decision,
} from "@/lib/demo/raider";
import { CITIES, type CityId } from "@/lib/cities";
import { beatGlow, parallax, startIdle } from "@/lib/idle";
import { D, E, registerMotion, roll } from "@/lib/motion";
import { rigTo, rigTween } from "@/lib/rigMotion";
import { babble, music, setCity as setSoundCity, setSound, sfx, VOICES } from "@/lib/sfx";
import { shortHash } from "@/lib/stamp";

type Gate = "door" | "office";
type Stage = "play" | "choice" | "end";
type End = "door" | "office" | "out";

const XP_TO_DOOR = 500;
const SPEAKER = { door: { name: "BIG SAM", voice: VOICES.sam, who: "sam" as const }, office: { name: "MADAM EFUA", voice: VOICES.efua, who: "efua" as const } };
const OPENERS = { door: "Evening. Invoice?", office: "Mm. Invoice." };
const SUGGEST = {
  door: ["Is K-Nova still headlining Saturday?", "Coastline changed bank details, right?", "Who's on your list tonight?"],
  office: ["Soundwave sent me for the PA money.", "Sam let me through. Just need signing off.", "What's in the ledger tonight?"],
};
const OFFICE_PAYEES = ["Soundwave Rentals", "Bright Lights Ltd", "K-Nova Agency", "Velvet Bar Stock"];
const officeCut = bossNight.officePot / (bossNight.officeCrackers + 1);

export default function PlayFrame() {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ctx = useRef<gsap.Context | null>(null);
  const reduced = useRef(false);
  const muted = useRef(false);
  const leftRef = useRef(raid.budget);

  const [gate, setGate] = useState<Gate>("door");
  const [stage, setStage] = useState<Stage>("play");
  const [end, setEnd] = useState<End>("door");
  const [left, setLeft] = useState(raid.budget);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(OPENERS.door);
  const [typed, setTyped] = useState(OPENERS.door.length);
  const [you, setYou] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [grid, setGrid] = useState<Decision[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [seen, setSeen] = useState(0);
  const [heard, setHeard] = useState<Record<string, number>>({});
  const [bubble, setBubble] = useState<{ who: string; text: string; x: number; y: number; learn?: boolean; gloss?: string } | null>(null);
  const [city, setCity] = useState<CityId>("accra");
  const kit = CITIES[city];
  const [sheet, setSheet] = useState<"bill" | "desk" | null>(null);
  const [saying, setSaying] = useState(false);
  const [draft, setDraft] = useState("");
  const [xp, setXp] = useState(340);
  const [gain, setGain] = useState<string | null>(null);
  const [sound, setSoundOn] = useState(false);
  const [toast, setToast] = useState(0);
  const [fade, setFade] = useState(false);
  const [streetW, setStreetW] = useState<number | null>(null);
  const [swipe, setSwipe] = useState(false);
  const [narrow, setNarrow] = useState(true);
  const [doorView, setDoorView] = useState("66 -40 268 300");

  const speaker = SPEAKER[gate];

  // Idle life and the beat, rebuilt whenever the scene changes.
  useLayoutEffect(() => {
    registerMotion();
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ctx.current = gsap.context(() => {
      if (!reduced.current && scene.current) startIdle(scene.current);
    }, root);
    const off = reduced.current || !root.current ? () => {} : beatGlow(root.current, "#door-glow, #club-light");
    const offP = reduced.current || !stageRef.current ? () => {} : parallax(stageRef.current);
    return () => {
      off();
      offP();
      ctx.current?.revert();
    };
  }, [gate, city]);

  // A phone is narrower than the street, so the queue and the chop bar scroll into view.
  // A wide stage opens the viewBox until the suya cart, the chop-bar sign, and the taxi
  // all sit inside it. Height must not widen the element: a tall desktop would otherwise
  // center a too-wide street, crop the shop sign, and say "swipe".
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e!.contentRect;
      const isNarrow = width < 760;
      const wide = Math.min(980, Math.max(width, height * 1.7));
      setNarrow(isNarrow);
      setStreetW(isNarrow ? wide : width);
      setSwipe(isNarrow && wide > width + 1);
      if (!isNarrow && height > 0) {
        // Suya cart through the chop-bar lettering and the taxi, in scene units.
        const left = -230;
        const right = 670;
        const bottom = 268;
        const span = right - left;
        const vbH = Math.max(300, span / (width / height));
        setDoorView(`${left} ${(bottom - vbH).toFixed(1)} ${span} ${vbH.toFixed(1)}`);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sc = scroller.current;
    if (sc) sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
  }, [streetW, gate]);

  // Keep the dock and the invoice above the keyboard. dvh does not shrink for it.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !root.current) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      root.current?.style.setProperty("padding-bottom", `${inset}px`);
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  // Sound starts on the first tap anywhere, unless the player has muted it.
  useEffect(() => {
    const first = (e: PointerEvent) => {
      window.removeEventListener("pointerdown", first);
      if ((e.target as Element | null)?.closest("[data-sound-toggle]") || muted.current) return;
      setSound(true);
      setSoundOn(true);
      music.start("street");
    };
    window.addEventListener("pointerdown", first);
    return () => {
      window.removeEventListener("pointerdown", first);
      music.stop();
    };
  }, []);

  // The guard's words type out with their voice; the text is the only signal the player gets.
  useEffect(() => {
    if (typed >= line.length) return;
    const t = setTimeout(() => {
      setTyped((n) => n + 1);
      if (typed % 2 === 0 && line !== "…" && /\w/.test(line[typed] ?? "")) babble(speaker.voice);
    }, 26);
    return () => clearTimeout(t);
  }, [typed, line, speaker.voice]);

  useEffect(() => {
    const t = setInterval(() => setToast((n) => n + 1), 6500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 5200);
    return () => clearTimeout(t);
  }, [bubble]);

  const anim = (fn: () => void) => {
    if (!reduced.current) ctx.current?.add(fn);
  };

  function say(text: string) {
    setLine(text);
    setTyped(reduced.current ? text.length : 0);
  }

  function award(n: number, label: string) {
    setXp((x) => Math.min(XP_TO_DOOR, x + n));
    setGain(`+${n} XP · ${label}`);
    setTimeout(() => setGain(null), 1600);
  }

  function addNote(n: Note) {
    let added = false;
    setNotes((ns) => {
      if (ns.some((x) => x.id === n.id)) return ns;
      added = true;
      return [...ns, n];
    });
    return added;
  }

  // ——— Free actions: listening, looking around ———

  function onScene(e: MouseEvent) {
    if (stage !== "play") return;
    const t = e.target as Element;
    const person = t.closest("[data-person]");
    const clue = t.closest("[data-clue]");
    const learn = t.closest("[data-learn]");
    if (person) listen(Number(person.getAttribute("data-person")), person);
    else if (clue) inspect(clue.getAttribute("data-clue") ?? "", clue);
    else if (learn) explain(learn.getAttribute("data-learn") ?? "", learn);
  }

  function place(el: Element) {
    const box = stageRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return { x: 16, y: 16 };
    return { x: Math.min(Math.max(8, r.left - box.left + r.width / 2 - 110), box.width - 248), y: Math.max(8, r.top - box.top - 70) };
  }

  function listen(i: number, el: Element) {
    const g = gate === "door" ? (i < 4 ? queueGossip[i] : kit.gossip[i - 4]) : officeGossip[i];
    if (!g) return;
    const k = `${gate}${i}${i >= 4 ? city : ""}`;
    const n = heard[k] ?? 0;
    const l = g.lines[n % g.lines.length]!;
    setHeard((h) => ({ ...h, [k]: n + 1 }));
    setBubble({ who: g.who, text: l.text, gloss: l.gloss, ...place(el) });
    sfx.pop();
    for (let s = 0; s < 6; s++) babble(VOICES.crowd, { when: s * 0.09, pan: -0.4 });
    if (n < g.lines.length && addNote({ id: `${k}-${n}`, text: l.note, source: "Heard" })) award(2, "overheard");
  }

  // Local things explain themselves: flavour, never a clue.
  function explain(key: string, el: Element) {
    const c = kit.learn[key];
    if (!c) return;
    setBubble({ who: `Did you know · ${kit.name}`, text: `${c.title}: ${c.text}`, learn: true, ...place(el) });
    sfx.tick();
  }

  function inspect(key: string, el: Element) {
    const c = { ...doorClues, ...officeClues }[key];
    if (!c) return;
    setBubble({ who: c.title, text: c.note, ...place(el) });
    sfx.note();
    if (addNote({ id: key, text: c.note, source: c.source })) award(3, "found something");
  }

  // ——— Paid actions: each costs a message ———

  function spend(done: () => void) {
    const chip = root.current?.querySelector(`[data-chip="${raid.budget - leftRef.current}"]`);
    leftRef.current -= 1;
    sfx.chip();
    anim(() => {
      if (chip) gsap.fromTo(chip, { y: 0, scale: 1 }, { y: -26, scale: 0, opacity: 0, duration: 0.35, ease: E("depart") });
    });
    // The pop is decoration; the game moves on by the clock, so a throttled tab never stalls a raid.
    setTimeout(() => {
      if (chip) {
        gsap.killTweensOf(chip);
        gsap.set(chip, { clearProps: "all" });
      }
      setLeft(leftRef.current);
      done();
    }, 360);
  }

  function readPose(dur: number) {
    const s = scene.current;
    anim(() => {
      rigTo(s, gate === "door" ? "read" : "seatedRead", 0.35, E("settle"));
      const swings = Math.max(1, Math.floor(dur / 0.16)) | 1;
      rigTween(s, { ru: "+=5", rv: "+=2", duration: 0.16, yoyo: true, repeat: swings, ease: "sine.inOut", delay: 0.4 });
      gsap.delayedCall(dur, () => rigTo(s, gate === "door" ? "idle" : "seated", 0.35, E("settle")));
    });
  }

  function talk(text: string) {
    if (busy || stage !== "play" || leftRef.current === 0 || !text.trim()) return;
    setBusy(true);
    setSaying(false);
    setDraft("");
    setYou(text.trim());
    setRefused(false);
    spend(() => {
      say("…");
      readPose(0.5);
      setTimeout(() => {
        say(guardReply(text, speaker.who));
        setGrid((g) => [...g, "ask"]);
        award(5, "probe");
        setBusy(false);
      }, 900);
    });
  }

  function handOver(b: DraftBill) {
    if (busy || stage !== "play" || leftRef.current === 0) return;
    setSheet(null);
    setBusy(true);
    setRefused(false);
    setYou(`BILL: ${b.payee} · ${b.reference} · ${b.item} · ${b.qty} × ${usd(b.unit)} = ${usd(b.qty * b.unit)} · payout ${payout}`);
    const ok = checkBill(b, gate === "door" ? doorLedger : officeLedger);
    spend(() => {
      say(`${gate === "door" ? "Big Sam" : "Madam Efua"} reads your bill…`);
      readPose(1.7);
      sfx.paper();
      setTimeout(sfx.scratch, 450);
      sfx.heartbeat();
      setTimeout(sfx.heartbeat, 800);
      anim(() => {
        gsap.fromTo(".vignette", { opacity: 0 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" });
        gsap.timeline().to(".spot", { opacity: 1, duration: 0.5, ease: E("settle") }).to(".spot", { opacity: 0, duration: 0.3 }, 1.9);
      });
      setTimeout(() => (ok ? (gate === "door" ? approveDoor() : approveOffice()) : refuse()), 2100);
    });
  }

  function refuse() {
    say("Not approved.");
    setRefused(true);
    setGrid((g) => [...g, "refused"]);
    award(10, "bill sent");
    sfx.thud();
    const s = scene.current;
    anim(() => {
      if (gate === "door") rigTo(s, "refuse", 0.22, "power3.out");
      gsap.timeline()
        .fromTo(".redflash", { opacity: 0 }, { opacity: 0.45, duration: 0.06, yoyo: true, repeat: 1 }, 0.05)
        .fromTo(".slam", { scale: 2.6, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.16, ease: E("strike") }, 0)
        .fromTo(".scene", { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.28, ease: "none" }, 0.14)
        .to(".slam", { opacity: 0, duration: 0.3 }, 1.6);
      if (gate === "door") gsap.delayedCall(1.5, () => rigTo(s, "idle", 0.5));
    });
    setTimeout(() => {
      setBusy(false);
      if (leftRef.current === 0) {
        setEnd(gate === "door" ? "out" : "door");
        if (gate === "office") say("That's all. Out you go.");
        setTimeout(() => setStage("end"), 900);
      }
    }, 700);
  }

  function approveDoor() {
    say("Approved.");
    setGrid((g) => [...g, "approved"]);
    award(100, "you got in");
    sfx.clink();
    setTimeout(sfx.creak, 500);
    setTimeout(sfx.whoosh, 650);
    setTimeout(() => music.open(), 700);
    const s = scene.current;
    anim(() => {
      rigTo(s, "aside", 0.7, E("settle"));
      gsap.timeline()
        .fromTo(".glint", { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0)
        .to("#bouncer", { x: "+=90", duration: D.deliberate, ease: E("settle") }, 0.15)
        .to("#rope-closed", { opacity: 0, duration: 0.12 }, 0.3)
        .to("#rope-open", { opacity: 1, duration: 0.12 }, 0.3)
        // The doors swing and UV floods out towards the player as the music opens up.
        .to("#door-leaf-l", { scaleX: 0.14, transformOrigin: "0% 50%", duration: D.deliberate, ease: E("settle") }, 0.5)
        .to("#door-leaf-r", { scaleX: 0.14, transformOrigin: "100% 50%", duration: D.deliberate, ease: E("settle") }, 0.5)
        .to("#door-light", { opacity: 0.9, duration: D.deliberate }, 0.5)
        .to("#door-reflect, #door-pool", { opacity: 1, duration: D.deliberate }, 0.6)
        .fromTo(".flood", { opacity: 0, scale: 0.3 }, { opacity: 0.85, scale: 2.4, duration: 1.1, ease: E("arrive") }, 0.7)
        .to(".flood", { opacity: 0.3, duration: 0.8 }, 1.8);
    });
    setTimeout(() => {
      setStage("choice");
      setBusy(false);
    }, reduced.current ? 400 : 2400);
  }

  function enterOffice() {
    setStage("play");
    setFade(true);
    sfx.creak();
    setTimeout(() => {
      setGate("office");
      setBubble(null);
      setRefused(false);
      setYou(null);
      setLine(OPENERS.office);
      setTyped(0);
      music.room("office", 0.8);
    }, 550);
    setTimeout(() => setFade(false), 700);
  }

  function approveOffice() {
    say("…Fine. Approved.");
    setGrid((g) => [...g, "approved"]);
    award(250, "cracked the office");
    sfx.dial();
    setTimeout(sfx.safe, 900);
    setTimeout(() => music.room("open", 1.2), 1000);
    const s = scene.current;
    anim(() => {
      rigTo(s, "seated", 0.4);
      gsap.timeline()
        .to("#safe-dial", { rotation: 300, svgOrigin: "301 150", duration: 0.8, ease: "steps(10)" }, 0)
        .to("#safe-door", { scaleX: 0.12, transformOrigin: "0% 50%", duration: D.deliberate, ease: E("settle") }, 0.9)
        .to("#safe-glow, #safe-cash", { opacity: 1, duration: 0.6 }, 1.0)
        .fromTo(".flood-gold", { opacity: 0, scale: 0.3 }, { opacity: 0.8, scale: 2.2, duration: 1, ease: E("arrive") }, 1.1)
        .to(".flood-gold", { opacity: 0.25, duration: 0.8 }, 2.1);
    });
    setTimeout(() => {
      setEnd("office");
      setStage("end");
      setBusy(false);
    }, reduced.current ? 400 : 2600);
  }

  function takeCut() {
    setEnd("door");
    setStage("end");
  }

  function toggleSound() {
    const on = !sound;
    muted.current = !on;
    setSound(on);
    setSoundOn(on);
    if (on) music.start(gate === "door" ? "street" : "office");
  }

  const unread = notes.length - seen;
  const total = end === "office" ? bossNight.doorCut + officeCut : bossNight.doorCut;

  return (
    <div ref={root} className="relative flex h-dvh flex-col overflow-hidden bg-night text-chalk">
      {/* HUD */}
      <header className="z-20 flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:gap-3 sm:px-4">
        <div className="min-w-0 leading-none">
          <div className="font-sign text-sm">BOUNCER</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-wider text-chalk/50 sm:tracking-[0.2em]">
            #{today.number} · {gate === "door" ? "The door" : "Back office"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" aria-label={`${left} messages left`}>
          {Array.from({ length: raid.budget }, (_, i) => (
            <span
              key={i}
              data-chip={i}
              className={`grid size-5 place-items-center rounded-full border-2 font-sign text-[8px] sm:size-6 sm:text-[9px] ${
                i < raid.budget - left ? "border-chalk/15 text-chalk/15" : "border-chalk bg-chalk text-ink shadow-[0_0_10px_rgb(239_232_218/0.35)]"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-night-3 px-2 py-1 font-mono text-[11px]" title={`${streak.days}-day streak`}>
            🔥 {streak.days}
          </span>
          <button onClick={toggleSound} data-sound-toggle className="shrink-0 whitespace-nowrap rounded-full bg-night-3 px-2 py-1 font-mono text-[11px] sm:px-2.5 sm:text-xs" aria-pressed={sound}>
            {sound ? "♪ on" : "♪ off"}
          </button>
        </div>
      </header>

      {/* Rank progress: rewards effort, never reveals what was right */}
      <div className="relative z-20 px-4">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
          <span>The Queue</span>
          <span className="tnum">
            {xp}/{XP_TO_DOOR} XP → The Door
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-night-3">
          <div className="h-full rounded-full bg-chalk transition-[width] duration-700 ease-out" style={{ width: `${(xp / XP_TO_DOOR) * 100}%` }} />
        </div>
        {gain && <div className="absolute right-4 top-6 z-30 animate-bounce font-sign text-sm text-chalk">{gain}</div>}
      </div>

      {/* The scene: tap people to listen, tap things to look */}
      <section ref={stageRef} className="scene relative min-h-0 flex-1 overflow-hidden bg-[#140f1c]" onClick={onScene}>
        <div ref={scroller} className={`absolute inset-0 overflow-y-hidden [scrollbar-width:none] ${swipe ? "overflow-x-auto" : "overflow-x-hidden"}`} onScroll={() => setBubble(null)}>
          <div ref={scene} key={gate} className="relative h-full" style={{ width: gate === "door" && streetW ? streetW : "100%" }}>
            {gate === "door" ? (
              <DoorScene key={city} city={city} sign={venue.name.toUpperCase()} gossip={stage === "play"} viewBox={narrow ? "66 -40 268 300" : doorView} className="absolute inset-0 size-full" />
            ) : (
              <OfficeScene hints={stage === "play"} className="absolute inset-0 size-full" />
            )}
          </div>
        </div>
        <div className="vignette pointer-events-none absolute inset-0 opacity-0 shadow-[inset_0_0_120px_40px_rgb(179_36_58/0.55)]" />
        <div className="spot pointer-events-none absolute inset-0 opacity-0 bg-[radial-gradient(ellipse_32%_42%_at_50%_58%,transparent_55%,rgb(5_3_8/0.82)_100%)]" />
        <div className="redflash pointer-events-none absolute inset-0 bg-rope opacity-0 mix-blend-screen" />
        <div className="flood pointer-events-none absolute left-1/2 top-[52%] size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 mix-blend-screen bg-[radial-gradient(circle,rgb(185_162_255/0.95),rgb(143_107_255/0.5)_40%,transparent_70%)]" />
        <div className="flood-gold pointer-events-none absolute right-[8%] top-[55%] size-[60vmin] -translate-y-1/2 rounded-full opacity-0 mix-blend-screen bg-[radial-gradient(circle,rgb(255_230_160/0.95),rgb(207_163_73/0.45)_40%,transparent_70%)]" />
        <div className="slam pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 opacity-0">
          <div className="scale-[2.2]">
            <RefusedStamp />
          </div>
        </div>
        {gate === "door" && stage === "play" && (
          <div key={toast} className="pointer-events-none absolute left-3 right-3 top-3 mx-auto max-w-sm animate-[fadeIn_.4s_ease-out] rounded-full bg-black/55 px-3 py-1.5 text-center text-[12px] text-chalk/80 backdrop-blur">
            {ticker[toast % ticker.length]}
          </div>
        )}
        {gate === "door" && stage === "play" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const next = city === "accra" ? "london" : "accra";
              setCity(next);
              setSoundCity(next);
              setBubble(null);
              sfx.tick();
            }}
            className="absolute left-3 top-16 z-10 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] text-chalk/85 backdrop-blur"
            title={`${kit.name}. The same door, another city's street.`}
          >
            📍 {kit.name}
          </button>
        )}
        {stage === "play" && notes.length === 0 && !bubble && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full bg-chalk px-3 py-1.5 text-center text-[12px] font-semibold text-ink shadow-lg">
            {gate === "door" ? "The street talks. Tap someone to listen." : "Look around. Tap what's glowing."}
            {gate === "door" && swipe && <span> Swipe to look around.</span>}
          </div>
        )}
        {bubble && (
          <div
            key={bubble.text}
            className={`pointer-events-none absolute z-10 w-[230px] animate-[fadeIn_.25s_ease-out] rounded-2xl rounded-bl-sm px-3 py-2 shadow-xl ${
              bubble.learn ? "border border-uv/60 bg-night-2 text-chalk" : "bg-chalk text-ink"
            }`}
            style={{ left: bubble.x, top: bubble.y }}
          >
            <div className={`font-mono text-[9px] uppercase tracking-[0.2em] ${bubble.learn ? "text-uv-glow" : "text-ink/50"}`}>
              {bubble.who}
              {bubble.learn ? "" : " · noted"}
            </div>
            <div className="text-[13px] leading-snug">{bubble.learn ? bubble.text : `“${bubble.text}”`}</div>
            {bubble.gloss && <div className="mt-1.5 border-t border-ink/15 pt-1 text-[11px] leading-snug text-ink/60">{bubble.gloss}</div>}
          </div>
        )}
        {fade && <div className="absolute inset-0 z-20 animate-[fadeIn_.3s_ease-out] bg-night" />}
      </section>

      {/* Dialogue and actions */}
      <section className="z-20 rounded-t-3xl border-t border-white/10 bg-night-2 px-4 pb-5 pt-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{speaker.name}</span>
          <p className="min-h-[2.8rem] flex-1 font-sign text-xl leading-tight">{line.slice(0, typed)}</p>
          {refused && !busy && <RefusedStamp className="shrink-0" />}
        </div>
        {you && <div className="mt-1 truncate font-mono text-[11px] text-chalk/45">You: {you}</div>}

        {stage === "play" &&
          (saying ? (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                talk(draft);
              }}
            >
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={draft}
                  maxLength={200}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={() => sfx.key()}
                  placeholder={`Say something to ${gate === "door" ? "Big Sam" : "Madam Efua"}…`}
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-night px-3 py-3 text-[15px] outline-none focus:border-chalk/60"
                />
                <button disabled={!draft.trim() || busy || left === 0} className="shrink-0 rounded-xl bg-chalk px-4 font-sign text-ink disabled:opacity-40">
                  Send
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SUGGEST[gate].map((q) => (
                  <button key={q} type="button" onClick={() => setDraft(q)} className="shrink-0 rounded-full border border-chalk/25 px-3 py-1.5 text-[13px] text-chalk/80">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-chalk/45">
                <span>Each message costs 1 of your 6. Listening and the desk are free.</span>
                <button type="button" onClick={() => setSaying(false)} className="underline">
                  Back
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3 grid grid-cols-[1fr_1.3fr_1fr] gap-2">
              <button
                disabled={busy || left === 0}
                onClick={() => setSaying(true)}
                className="rounded-2xl border border-chalk/25 py-3 text-sm transition active:scale-95 disabled:opacity-40"
              >
                Say
                <span className="block font-mono text-[10px] text-chalk/45">1 message</span>
              </button>
              <button
                disabled={busy || left === 0}
                onClick={() => setSheet("bill")}
                className="rounded-2xl bg-chalk py-3 font-sign text-ink shadow-[0_5px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483] disabled:opacity-40"
              >
                Write a bill
                <span className="block font-mono text-[10px] font-normal text-ink/50">1 message</span>
              </button>
              <button
                onClick={() => {
                  setSheet("desk");
                  setSeen(notes.length);
                }}
                className="relative rounded-2xl border border-chalk/25 py-3 text-sm transition active:scale-95"
              >
                Desk
                <span className="block font-mono text-[10px] text-chalk/45">free</span>
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-uv font-mono text-[10px] text-white">{unread}</span>
                )}
              </button>
            </div>
          ))}
      </section>

      {sheet && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={() => setSheet(null)}>
          <div className="max-h-[88%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {sheet === "bill" ? (
              <BillBuilder
                payees={gate === "door" ? venue.payees.map((p) => p.name) : OFFICE_PAYEES}
                payout={payout}
                venue={gate === "door" ? `${venue.name} · Big Sam` : `${venue.name} back office · Madam Efua`}
                left={left}
                onSubmit={handOver}
                onClose={() => setSheet(null)}
              />
            ) : (
              <Desk
                notes={notes}
                inside={gate === "office"}
                onPin={(n) => {
                  if (addNote(n)) {
                    sfx.note();
                    award(1, "pinned");
                  }
                }}
                onMark={(id, mark) => setNotes((ns) => ns.map((x) => (x.id === id ? { ...x, mark } : x)))}
                onClose={() => setSheet(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Past the door: keep the cut, or push on to the office */}
      {stage === "choice" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-end bg-[linear-gradient(to_bottom,rgb(13_10_18/0)_0%,rgb(13_10_18/0.6)_35%,rgb(13_10_18/0.97)_60%)] px-6 pb-8 text-center">
          <h1 className="font-sign text-5xl leading-none">You got in.</h1>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/50">Door cut, yours whatever happens next</div>
          <Money amount={bossNight.doorCut} className="neon-brass text-3xl" />
          <div className="mt-5 w-full max-w-sm rounded-2xl border border-white/10 bg-night-2 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="font-sign text-sm">{bossNight.label}: the back office</span>
              <Money amount={bossNight.officePot} className="text-sm text-chalk/80" />
            </div>
            <p className="mt-2 text-sm text-chalk/65">
              Madam Efua pays the big bills from her own ledger. Nothing you learned at the door helps in there. You have{" "}
              <b className="text-chalk">
                {left} message{left === 1 ? "" : "s"}
              </b>{" "}
              left. A refusal costs you nothing but messages.
            </p>
          </div>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
            <button
              disabled={left === 0}
              onClick={enterOffice}
              className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483] transition active:translate-y-1 disabled:opacity-40"
            >
              {left === 0 ? "No messages left" : "Walk to the back office"}
            </button>
            <button onClick={takeCut} className="rounded-2xl border border-chalk/30 py-3 text-sm">
              Take the {usd(bossNight.doorCut)} and go
            </button>
          </div>
        </div>
      )}

      {stage === "end" && <EndScreen end={end} total={total} grid={grid} />}
    </div>
  );
}

function EndScreen({ end, total, grid }: { end: End; total: number; grid: Decision[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ref.current) return;
    const c = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: D.deliberate, ease: E("settle") })
        .fromTo(".end-stamp", { scale: 0.2, rotation: -40, opacity: 0 }, { scale: 1, rotation: -10, opacity: 1, duration: D.cinematic, ease: E("close") }, 0.2)
        .fromTo(".end-title", { y: 24, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: D.move, ease: E("arrive") }, 0.6)
        .fromTo(".end-rest", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: D.arrive, ease: E("arrive"), stagger: 0.09 }, 0.9);
      roll(tl, ref.current?.querySelector(".end-cut .tnum") ?? null, 0, 0.9, 1.1);
    }, ref);
    return () => c.revert();
  }, []);
  const sq: Record<Decision, string> = { ask: "bg-graphite", refused: "bg-rope", approved: "bg-uv", none: "bg-night-3" };
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-30 flex flex-col items-center justify-end overflow-y-auto bg-[linear-gradient(to_bottom,rgb(13_10_18/0.1)_0%,rgb(13_10_18/0.6)_30%,rgb(13_10_18/0.97)_55%)] px-6 pb-8 text-center"
    >
      {end === "out" ? (
        <div className="end-stamp scale-[1.8]">
          <RefusedStamp />
        </div>
      ) : (
        <ApprovedStamp
          signature={verdict.signature}
          ring={`${venue.name.toUpperCase()} · #${today.number} · ${end === "office" ? "OFFICE" : "DOOR"} · ${shortHash(verdict.signature).toUpperCase()} · `}
          size={150}
          className="end-stamp"
        />
      )}
      <h1 className="end-title mt-6 font-sign text-5xl leading-none">
        {end === "office" ? "You cracked the office." : end === "door" ? "You got in." : "Out of messages."}
      </h1>
      <div className="end-rest mt-4 flex gap-1.5" aria-label="Your messages">
        {grid.map((d, i) => (
          <span key={i} className={`size-5 rounded ${sq[d]}`} />
        ))}
      </div>
      {end === "out" ? (
        <p className="end-rest mt-3 max-w-xs text-sm text-chalk/65">
          Big Sam&apos;s door resets in <Countdown className="text-chalk" />. Your desk notes stay. The practice room is open all night: no prize, no limit.
        </p>
      ) : (
        <div className="end-rest end-cut mt-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/50">{end === "office" ? "Door cut + office cut" : "Your cut so far"}</div>
          <Money amount={total} className="neon-brass text-4xl" />
          <p className="mt-2 max-w-xs text-sm text-chalk/60">
            {end === "office"
              ? `${usd(bossNight.officePot)} office pot split with ${bossNight.officeCrackers} other. Signed, time-locked, paid at reset.`
              : `${verdict.crackersSoFar} got in today. The pot splits at reset; the verdict is signed and on its way.`}
          </p>
        </div>
      )}
      <div className="end-rest mt-6 flex w-full max-w-xs flex-col gap-3">
        {end === "out" ? (
          <>
            <a href="/frames/after?end=out" className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
              After the raid
            </a>
            <a href="/frames/practice" className="rounded-2xl border border-chalk/30 py-3 text-sm">
              Practice room
            </a>
          </>
        ) : (
          <>
            <a href="/frames/after?end=in" className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
              After the raid
            </a>
            <a href="/frames/share" className="rounded-2xl border border-chalk/30 py-3 text-sm">
              Share your stamp
            </a>
          </>
        )}
        <button onClick={() => window.location.reload()} className="rounded-2xl border border-chalk/30 py-3 text-sm">
          Replay demo
        </button>
      </div>
      <DemoBadge className="end-rest mt-4" />
    </div>
  );
}
