"use client";

import gsap from "gsap";
import { useRef, useState } from "react";
import { DemoBadge, FrameNav } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { HEAD_COLORS, NEONS, PARTS, SAM, SKINS, type Look, type Neon, type Option } from "@/lib/look";
import { CITIES, type CityId } from "@/lib/cities";
import { rigTo, rigTween } from "@/lib/rigMotion";
import { setSound, sfx } from "@/lib/sfx";

const TABS = ["Body", "Head", "Face", "Outfit", "Venue", "Voice"] as const;
type Tab = (typeof TABS)[number];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;

export default function CreatorFrame() {
  const root = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState<Look>({ ...SAM, name: "Kwame", catchphrase: "Not on my list, not tonight." });
  const [sign, setSign] = useState("THE GATE");
  const [neon, setNeon] = useState<Neon>("rope");
  const [city, setCity] = useState<CityId>("accra");
  const [tab, setTab] = useState<Tab>("Body");
  const [saved, setSaved] = useState(false);
  const [sound, setSoundOn] = useState(false);

  const set = <K extends keyof Look>(k: K, v: Look[K]) => {
    setLook((l) => ({ ...l, [k]: v }));
    setSaved(false);
    sfx.tick();
  };

  function randomize() {
    setLook((l) => ({
      ...l,
      build: pick(PARTS.build).value,
      skin: Math.floor(Math.random() * SKINS.length),
      head: pick(PARTS.head).value,
      headColor: pick(HEAD_COLORS),
      eyewear: pick(PARTS.eyewear).value,
      outfit: pick(PARTS.outfit.filter((o) => !o.locked)).value,
      extra: pick(PARTS.extra).value,
      earpiece: Math.random() > 0.3,
    }));
    sfx.chip();
  }

  // Reactions only ever follow a verdict in the game; here they're previewed on demand.
  function react(kind: "read" | "refuse" | "approve") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scene = root.current?.querySelector(".scene-box");
    const q = gsap.utils.selector(root);
    if (kind === "read") {
      sfx.paper();
      setTimeout(sfx.scratch, 400);
      rigTo(scene, "read", 0.35);
      rigTween(scene, { ru: "+=5", rv: "+=2", duration: 0.16, yoyo: true, repeat: 9, ease: "sine.inOut", delay: 0.4 });
      gsap.delayedCall(2, () => rigTo(scene, "idle", 0.4));
    } else if (kind === "refuse") {
      sfx.thud();
      rigTo(scene, "refuse", 0.22, "power3.out");
      gsap.fromTo(q(".scene-box"), { x: 0 }, { keyframes: { x: [-6, 5, -3, 0] }, duration: 0.25, delay: 0.05 });
      gsap.delayedCall(1.4, () => rigTo(scene, "idle", 0.5));
    } else {
      sfx.clink();
      rigTo(scene, "aside", 0.6);
      gsap.timeline()
        .to(q("#bouncer"), { x: "+=90", duration: 0.6, ease: "power2.inOut" })
        .to(q("#rope-closed"), { opacity: 0, duration: 0.1 }, 0.15)
        .to(q("#rope-open"), { opacity: 1, duration: 0.1 }, 0.15)
        .to(q("#bouncer"), { x: "-=90", duration: 0.6, ease: "power2.inOut" }, 1.8)
        .to(q("#rope-open"), { opacity: 0, duration: 0.1 }, 2.3)
        .to(q("#rope-closed"), { opacity: 1, duration: 0.1 }, 2.3);
      gsap.delayedCall(1.8, () => rigTo(scene, "idle", 0.6));
    }
  }

  return (
    <div ref={root} className="min-h-dvh bg-night pb-24 text-chalk lg:grid lg:h-dvh lg:grid-cols-[1.2fr_1fr] lg:pb-0">
      {/* Live preview at the door. Shorter on a phone so Save sits on the first screen. */}
      <section className="scene-box relative h-[34dvh] min-h-[220px] bg-[#1a1424] sm:h-[48dvh] sm:min-h-[340px] lg:h-full">
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          <div className="leading-none">
            <div className="font-sign text-lg">Bouncer studio</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/60">Design your bouncer</div>
          </div>
          <button
            onClick={() => {
              setSound(!sound);
              setSoundOn(!sound);
            }}
            className="shrink-0 rounded-full bg-black/50 px-2 py-1 font-mono text-[11px] sm:px-2.5 sm:text-xs"
            aria-pressed={sound}
          >
            {sound ? "♪ on" : "♪ off"}
          </button>
        </header>
        <SceneLife key={JSON.stringify(look) + city} className="absolute inset-0">
          <DoorScene city={city} sign={sign.toUpperCase() || "YOUR VENUE"} neon={neon} look={look} p="cr" className="size-full" label={`${look.name} at the door of ${sign}`} />
        </SceneLife>
        <div className="absolute left-3 top-[20%] max-w-[55%] animate-[fadeIn_.35s_ease-out] rounded-2xl rounded-bl-sm bg-chalk px-3 py-2 text-[13px] text-ink shadow-lg">
          “{look.catchphrase}”
        </div>
        <div className="absolute bottom-2 left-1/2 flex w-max max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 lg:bottom-16">
          <span className="rounded bg-chalk px-2 py-1 font-sign text-xs text-ink">{look.name.toUpperCase() || "NAMELESS"}</span>
          <button onClick={() => react("read")} className="whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur">
            Read
          </button>
          <button onClick={() => react("refuse")} className="whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur">
            Refuse
          </button>
          <button onClick={() => react("approve")} className="whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur">
            Let in
          </button>
        </div>
      </section>

      {/* Parts */}
      <section className="flex min-h-0 flex-col bg-night-2 lg:overflow-y-auto">
        <nav className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-white/10 bg-night-2 px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${t === tab ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
            >
              {t}
            </button>
          ))}
          <button onClick={randomize} className="ml-auto shrink-0 rounded-full border border-chalk/25 px-3 py-1.5 text-sm">
            🎲 Random
          </button>
        </nav>

        <div className="space-y-6 p-4">
          {tab === "Body" && (
            <>
              <Group label="Build">
                <Choices opts={PARTS.build} value={look.build} onPick={(v) => set("build", v)} />
              </Group>
              <Group label="Skin tone">
                <div className="flex flex-wrap gap-2">
                  {SKINS.map((c, i) => (
                    <Swatch key={c} color={c} active={look.skin === i} onClick={() => set("skin", i)} label={`Skin tone ${i + 1}`} />
                  ))}
                </div>
              </Group>
            </>
          )}

          {tab === "Head" && (
            <>
              <Group label="Style">
                <Choices opts={PARTS.head} value={look.head} onPick={(v) => set("head", v)} />
              </Group>
              {look.head !== "bald" && (
                <Group label="Colour">
                  <div className="flex flex-wrap gap-2">
                    {HEAD_COLORS.map((c) => (
                      <Swatch key={c} color={c} active={look.headColor === c} onClick={() => set("headColor", c)} label={`Colour ${c}`} />
                    ))}
                  </div>
                </Group>
              )}
            </>
          )}

          {tab === "Face" && (
            <>
              <Group label="Eyewear">
                <Choices
                  opts={[...PARTS.eyewear, { value: "gold" as never, label: "Gold shades", locked: "Reach VIP" }]}
                  value={look.eyewear}
                  onPick={(v) => set("eyewear", v)}
                />
              </Group>
              <Group label="Extras">
                <Choices opts={PARTS.extra} value={look.extra} onPick={(v) => set("extra", v)} />
              </Group>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={look.earpiece} onChange={(e) => set("earpiece", e.target.checked)} className="size-4 accent-[#8f6bff]" />
                Earpiece
              </label>
            </>
          )}

          {tab === "Outfit" && (
            <Group label="Outfit">
              <Choices opts={PARTS.outfit} value={look.outfit} onPick={(v) => set("outfit", v)} />
            </Group>
          )}

          {tab === "Venue" && (
            <>
              <Group label="Sign">
                <input
                  value={sign}
                  maxLength={14}
                  onChange={(e) => {
                    setSign(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-night px-3 py-2.5 font-sign tracking-wide"
                />
              </Group>
              <Group label="City">
                <div className="flex gap-2">
                  {(Object.keys(CITIES) as CityId[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCity(c);
                        sfx.tick();
                      }}
                      className={`rounded-xl border px-4 py-2 text-sm ${city === c ? "border-chalk bg-chalk text-ink" : "border-white/15"}`}
                    >
                      {CITIES[c].name}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-chalk/50">The street around your door. Same rules everywhere; more cities come with the seasons.</p>
              </Group>
              <Group label="Neon">
                <div className="flex gap-2">
                  {NEONS.map((n) => (
                    <button
                      key={n.value}
                      onClick={() => setNeon(n.value)}
                      className={`rounded-xl border px-4 py-2 text-sm ${neon === n.value ? "border-chalk" : "border-white/15"}`}
                      style={{ color: n.fill, textShadow: `0 0 8px ${n.stroke}` }}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </Group>
            </>
          )}

          {tab === "Voice" && (
            <>
              <Group label="Name">
                <input
                  value={look.name}
                  maxLength={18}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-night px-3 py-2.5"
                />
              </Group>
              <Group label="Catchphrase">
                <input
                  value={look.catchphrase}
                  maxLength={40}
                  onChange={(e) => set("catchphrase", e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-night px-3 py-2.5"
                />
                <p className="mt-2 text-xs text-chalk/50">
                  Shown in the queue and on share cards. Names and lines are checked: nothing offensive, no real people.
                </p>
              </Group>
            </>
          )}

          <div className="rounded-2xl border border-white/10 bg-night p-4 text-sm text-chalk/70">
            Looks never change a verdict. Every bouncer reads bills with the same animation; reactions play only after the
            decision, so there&apos;s nothing to read off their face.
          </div>

          {saved ? (
            <div className="rounded-2xl border border-chalk/30 bg-night p-4">
              <div className="font-sign">{look.name} is ready for the door.</div>
              <p className="mt-1 text-sm text-chalk/60">Next: write their instructions and run the test bench.</p>
            </div>
          ) : (
            <button
              onClick={() => {
                setSaved(true);
                sfx.win();
              }}
              className="w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
            >
              Save {look.name || "bouncer"}
            </button>
          )}
          <DemoBadge />
        </div>
      </section>
      <FrameNav current="creator" />
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/50">{label}</div>
      {children}
    </div>
  );
}

function Choices<T extends string>({ opts, value, onPick }: { opts: Option<T>[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          key={o.value}
          disabled={!!o.locked}
          onClick={() => onPick(o.value)}
          title={o.locked ? `Earned: ${o.locked}` : undefined}
          className={`rounded-xl border px-3.5 py-2 text-sm transition active:scale-95 ${
            o.value === value ? "border-chalk bg-chalk text-ink" : "border-white/15"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {o.locked ? "🔒 " : ""}
          {o.label}
          {o.locked && <span className="block text-[10px] text-chalk/60">{o.locked}</span>}
        </button>
      ))}
    </div>
  );
}

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`size-10 rounded-full border-2 transition active:scale-90 ${active ? "border-chalk ring-2 ring-chalk/40" : "border-white/10"}`}
      style={{ background: color }}
    />
  );
}
