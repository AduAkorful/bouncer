"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bouncer } from "@/components/Bouncer";
import { DemoBadge, FrameNav, NetworkTag } from "@/components/bits";
import { SceneLife } from "@/components/SceneLife";
import {
  CASES,
  DRAFT_V7,
  FIXED_RULES,
  LEAKY_LINE,
  PASS_HONEST,
  PATCH_LINE,
  RUN_ORDER,
  draftHash,
  runBench,
  type BenchResult,
  type BenchScore,
} from "@/lib/demo/bench";
import { morningReport, myVault } from "@/lib/demo/studio";
import { PAT } from "@/lib/look";
import { rigTo } from "@/lib/rigMotion";
import { sfx } from "@/lib/sfx";

// Last night's live version, so every run shows what got better or worse.
const LIVE = runBench(DRAFT_V7);
const STEP_MS = 45;

const tile = {
  approved: "bg-uv shadow-[0_0_8px_rgb(143_107_255/0.7)]",
  refused: "bg-rope",
  ask: "bg-graphite",
} as const;

const banner = {
  passed: { cls: "border-uv bg-uv/15 text-uv-glow", title: "Passed", body: "Pays the real bills, keeps every scam out, gives nothing away." },
  leaky: { cls: "border-rope bg-rope/15 text-chalk", title: "Leaky", body: "She's telling raiders things. Tap the marked squares to see what she said." },
  "too strict": { cls: "border-chalk/40 bg-chalk/10 text-chalk", title: "Too strict", body: `Real payees are being turned away. She needs to pay at least ${PASS_HONEST} of 30 to go live.` },
} as const;

export default function StudioFrame() {
  const root = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(DRAFT_V7);
  const [score, setScore] = useState<BenchScore | null>(null);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [picked, setPicked] = useState<BenchResult | null>(null);
  const [staged, setStaged] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [pane, setPane] = useState<"write" | "bench">("write");
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const leaky = draft.includes(LEAKY_LINE);
  const done = score && !running && shown === CASES.length;
  const changed = draft !== DRAFT_V7;

  // Arriving from the morning report's patch button: apply the suggested line and point at it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("patch") === "1") applyPatch();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPatch() {
    setDraft((d) => d.replace(LEAKY_LINE, PATCH_LINE));
    invalidate();
    sfx.note();
    requestAnimationFrame(() =>
      gsap.fromTo(".patch-flash", { backgroundColor: "rgb(143 107 255 / 0.35)" }, { backgroundColor: "rgb(143 107 255 / 0)", duration: 1.6, ease: "power2.out" }),
    );
  }

  function invalidate() {
    clearInterval(timer.current);
    setScore(null);
    setShown(0);
    setRunning(false);
    setPicked(null);
    setStaged(null);
  }

  function run() {
    const s = runBench(draft);
    const scene = root.current?.querySelector(".bench-pat");
    setScore(s);
    setShown(0);
    setPicked(null);
    setRunning(true);
    sfx.paper();
    rigTo(scene, "read", 0.35);
    let i = 0;
    timer.current = setInterval(() => {
      i++;
      setShown(i);
      if (i % 3 === 0) sfx.tick();
      if (i >= CASES.length) {
        clearInterval(timer.current);
        setRunning(false);
        rigTo(scene, s.state === "passed" ? "idle" : "refuse", 0.3);
        if (s.state !== "passed") gsap.delayedCall(1.2, () => rigTo(scene, "idle", 0.5));
        if (s.state === "passed") sfx.win();
        else sfx.thud();
        gsap.from(".bench-banner", { y: 8, opacity: 0, duration: 0.3, ease: "power2.out" });
      }
    }, STEP_MS);
  }

  function stage() {
    setStaged(draftHash(draft));
    sfx.clink();
  }

  const visible = new Set(RUN_ORDER.slice(0, shown));
  const lines = draft.split("\n");

  return (
    <div ref={root} className="min-h-dvh bg-night pb-24 text-chalk lg:grid lg:h-dvh lg:grid-cols-[1fr_1fr] lg:overflow-hidden lg:pb-0">
      <div className="sticky top-0 z-30 flex gap-1 border-b border-white/10 bg-night p-2 lg:hidden">
        {(["write", "bench"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setPane(id)}
            className={`flex-1 rounded-full py-2 text-sm ${pane === id ? "bg-chalk font-semibold text-ink" : "text-chalk/70"}`}
          >
            {id === "write" ? "Write" : "Bench"}
          </button>
        ))}
      </div>
      {/* Write: the quiet workbench */}
      <section className={`${pane === "bench" ? "hidden lg:flex" : "flex"} flex-col bg-paper text-on-paper lg:overflow-y-auto`}>
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <div className="font-sign text-lg leading-none">Studio</div>
            <div className="mt-1 font-mono text-[11px] text-muted">
              {myVault.bouncer} · {myVault.venue} · v{myVault.version} live
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${changed ? "bg-on-paper text-paper" : "border border-rule text-muted"}`}>
            {changed ? `v${myVault.version + 1} draft` : "No changes"}
          </span>
        </header>

        {staged && (
          <div className="border-b border-uv/40 bg-uv/10 px-5 py-3 text-sm">
            <b>Staged for the next reset.</b> v{myVault.version + 1} · <span className="font-mono">#{staged}</span> goes live at 00:00 UTC. Tonight she stays on v
            {myVault.version}.
          </div>
        )}

        <div className="space-y-5 p-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Fixed rules · set by the game</div>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {FIXED_RULES.map((r) => (
                <li key={r.k} className="rounded-xl border border-rule bg-paper-2 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">🔒 {r.k}</span>
                    <span className="font-mono text-[11px]">{r.v}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{r.why}</p>
                </li>
              ))}
            </ul>
          </div>

          {leaky && (
            <div className="rounded-2xl border border-rope/50 bg-rope/10 p-4 text-sm">
              <div className="font-semibold text-rope">Line 4 is leaking</div>
              <p className="mt-1">
                Last night {morningReport.cracks[0]!.raider} heard “{morningReport.cracks[0]!.leakedLine}” twice and guessed the rest.
              </p>
              <p className="mt-2 font-mono text-[12px]">{PATCH_LINE}</p>
              <button onClick={applyPatch} className="mt-3 rounded-full bg-on-paper px-4 py-2 text-sm font-semibold text-paper">
                Use the suggested line
              </button>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="draft" className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                How she works the door
              </label>
              <span className="font-mono text-[10px] text-muted">{draft.length} chars</span>
            </div>
            {/* A textarea over a highlighter, so the patched line can glow without a rich editor */}
            <div className="relative mt-2 rounded-2xl border border-rule bg-[#fbf8f1] font-mono text-[13px] leading-6 text-ink">
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 text-transparent">
                {lines.map((l, i) => (
                  <div key={i} className={l === PATCH_LINE ? "patch-flash rounded" : l === LEAKY_LINE ? "rounded bg-rope/15 underline decoration-rope decoration-wavy" : ""}>
                    {l || " "}
                  </div>
                ))}
              </div>
              <textarea
                id="draft"
                value={draft}
                spellCheck={false}
                onChange={(e) => {
                  setDraft(e.target.value);
                  invalidate();
                }}
                rows={lines.length + 2}
                className="relative block w-full resize-none bg-transparent p-4 outline-none [field-sizing:content]"
              />
            </div>
            <p className="mt-2 text-xs text-muted">Plain words. She reads this before every message. You never write the ledger; the game hands it to her each round.</p>
          </div>

          <div className="rounded-2xl border border-rule p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Close the door</div>
                <p className="text-xs text-muted">Stops everything now. Real bills that arrive while it&apos;s shut count as refused.</p>
              </div>
              <button
                role="switch"
                aria-checked={closed}
                onClick={() => {
                  setClosed((c) => !c);
                  sfx.creak();
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${closed ? "bg-rope" : "bg-on-paper/20"}`}
              >
                <span className={`absolute top-1 size-5 rounded-full bg-paper shadow transition-all ${closed ? "left-6" : "left-1"}`} />
              </button>
            </div>
            {closed && <p className="mt-2 text-xs font-semibold text-rope">Door shut. Your honest-pay rate drops for every real bill turned away.</p>}
          </div>
        </div>
      </section>

      {/* Test: the bench. On a phone it is its own pane, so Run is not a screen below the editor. */}
      <section className={`${pane === "write" ? "hidden lg:flex" : "flex"} flex-col lg:overflow-y-auto`}>
        <div className="relative h-44 shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_20%,#2a2040,#0d0a12_70%)]">
          <SceneLife className="bench-pat absolute inset-0">
            <svg viewBox="126 52 140 124" preserveAspectRatio="xMidYMin meet" className="absolute bottom-0 right-2 h-full w-auto sm:right-8" role="img" aria-label={`${myVault.bouncer} reading test bills`}>
              <Bouncer look={PAT} x={196} y={228} scale={0.9} p="bench" rim="#b9a2ff" />
            </svg>
          </SceneLife>
          <div className="absolute left-4 top-4">
            <div className="font-sign text-lg">Test bench</div>
            <div className="font-mono text-[11px] text-chalk/60">30 real bills · 30 known attacks</div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Real bills paid" value={score ? countIn(score, visible, "honest") : null} of={30} was={LIVE.honestPaid} final={!!done} />
            <Stat label="Scams blocked" value={score ? countIn(score, visible, "attack") : null} of={30} was={LIVE.blocked} final={!!done} />
            <Stat label="Leaks" value={score ? score.results.filter((r) => visible.has(r.id) && r.leak).length : null} was={LIVE.leaks} final={!!done} lowerIsBetter />
          </div>

          <div className="grid grid-cols-10 gap-1.5" aria-label="Bench results">
            {RUN_ORDER.map((id) => {
              const r = score?.results[id];
              const on = r && visible.has(id);
              return (
                <button
                  key={id}
                  disabled={!on}
                  onClick={() => r && setPicked(r)}
                  aria-label={on ? `${r.label}: ${r.verdict}` : "Not run"}
                  className={`relative aspect-square rounded-md transition-transform ${on ? `${tile[r.verdict]} scale-100` : "scale-90 border border-white/10"} ${
                    picked?.id === id ? "ring-2 ring-chalk" : ""
                  } ${on && !r.correct ? "after:absolute after:inset-1 after:rounded-sm after:border-2 after:border-chalk" : ""}`}
                >
                  {on && r.kind === "attack" && <span className="absolute inset-0 grid place-items-center text-[9px] text-black/50">✕</span>}
                  {on && r.leak && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-chalk ring-2 ring-rope" />}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-chalk/60">
            <Key c="bg-uv" t="paid" />
            <Key c="bg-rope" t="refused" />
            <Key c="bg-graphite" t="asked for more" />
            <span>✕ attack</span>
            <span>□ got it wrong</span>
            <span>● leak</span>
          </div>

          {done && score && (
            <div className={`bench-banner rounded-2xl border p-4 ${banner[score.state].cls}`}>
              <div className="font-sign text-base">{banner[score.state].title}</div>
              <p className="mt-1 text-sm text-chalk/80">{banner[score.state].body}</p>
            </div>
          )}

          {picked && (
            <div className="rounded-2xl border border-white/10 bg-night-2 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{picked.label}</span>
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${picked.kind === "attack" ? "bg-rope/30" : "bg-uv/30"}`}>{picked.kind}</span>
              </div>
              <p className="mt-2 rounded-xl border border-dashed border-chalk/25 p-2.5 font-mono text-[12px]">{picked.says}</p>
              <p className="mt-2">
                <span className="text-chalk/50">{myVault.bouncer}:</span> “{picked.reply}”
              </p>
              <p className={`mt-2 text-xs ${picked.correct ? "text-chalk/60" : "font-semibold text-rope"}`}>
                {picked.correct ? "Right call." : picked.kind === "attack" ? "Wrong call: a scam got paid." : "Wrong call: a real bill was turned away."}
                {picked.leak && <span className="ml-1 text-rope">Leak: {picked.leak.toLowerCase()}.</span>}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={run}
              disabled={running}
              className="flex-1 rounded-2xl bg-chalk py-3.5 font-sign text-ink shadow-[0_5px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483] disabled:opacity-60"
            >
              {running ? "Running…" : done ? "Run again" : "Run the bench"}
            </button>
            {staged ? (
              <Link href="/frames/release" className="flex flex-1 items-center justify-center rounded-2xl bg-uv py-3.5 text-center text-sm font-semibold text-white">
                Release v{myVault.version + 1}
              </Link>
            ) : (
              <button
                onClick={stage}
                disabled={!done || score?.state !== "passed" || !changed}
                className="flex-1 rounded-2xl border border-uv py-3.5 text-sm font-semibold text-uv-glow transition disabled:border-white/10 disabled:text-chalk/30"
              >
                Stage v{myVault.version + 1}
              </button>
            )}
          </div>
          {!score && <p className="text-xs text-chalk/50">Every edit has to pass the bench before it can go live. It costs nothing to run.</p>}

          <div className="flex items-center justify-between pt-2">
            <NetworkTag className="text-chalk/60" />
            <DemoBadge />
          </div>
        </div>
      </section>
      <FrameNav current="studio" />
    </div>
  );
}

function countIn(s: BenchScore, visible: Set<number>, kind: "honest" | "attack") {
  return s.results.filter((r) => r.kind === kind && visible.has(r.id) && r.correct).length;
}

function Stat({ label, value, of, was, final, lowerIsBetter = false }: { label: string; value: number | null; of?: number; was: number; final: boolean; lowerIsBetter?: boolean }) {
  const diff = value === null ? 0 : value - was;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-night-2 p-3">
      <div className="font-mono text-2xl leading-none tnum">
        {value ?? "–"}
        {of && <span className="text-sm text-chalk/40">/{of}</span>}
      </div>
      <div className="mt-1 text-[11px] text-chalk/60">{label}</div>
      <div className="mt-1 font-mono text-[10px] text-chalk/40">
        v7: {was}
        {final && diff !== 0 && <span className={better ? "ml-1 text-uv-glow" : "ml-1 text-rope"}>{diff > 0 ? `▲${diff}` : `▼${-diff}`}</span>}
      </div>
    </div>
  );
}

function Key({ c, t }: { c: string; t: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-sm ${c}`} />
      {t}
    </span>
  );
}
