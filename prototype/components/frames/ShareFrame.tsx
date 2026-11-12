"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { ShareButton } from "@/components/ShareButton";
import { shareText, squares, type Shared, type Square } from "@/lib/share-text";
import { DEMO_NOW_MS } from "@/lib/demo/clock";

const IN_GRID: Square[] = ["ask", "ask", "approved", "none", "none", "none"];
const OUT_GRID: Square[] = ["refused", "ask", "refused", "ask", "refused", "ask"];

export function ShareFrame({ query }: { query: Record<string, string> }) {
  const state = query.state || "empty";
  const card = state === "card-open" || state === "card-taken" || state === "card-player" ? state : null;
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Share</p>
        {card ? <CardArt kind={card} /> : <Night state={state} />}
      </div>
    </main>
  );
}

function Night({ state }: { state: string }) {
  if (state === "empty") {
    return (
      <>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Nothing to share yet.</h1>
        <p className="mt-2 text-sm text-chalk/70">Finish a raid on this browser and its card shows up here.</p>
        <a href="/frames/home" className="chalk-focus mt-5 inline-flex min-h-11 items-center rounded-2xl bg-chalk px-5 font-sign text-ink">Play tonight&apos;s door</a>
      </>
    );
  }
  const kind = state === "out" ? "out" : state === "paid" ? "paid" : "in";
  const shared: Shared = kind === "paid"
    ? { kind, sign: "SKYLINE SOCIAL", guard: "Delroy", grid: IN_GRID, streak: 3, amount: "3.24 tUSDC" }
    : { kind, sign: "SKYLINE SOCIAL", guard: "Delroy", grid: kind === "out" ? OUT_GRID : IN_GRID, streak: 3 };
  const text = shareText(shared, 6);
  const title = kind === "out" ? "Turned away" : kind === "paid" ? "Got paid" : "Got in";
  const shown = state === "copied" ? "copied" : state === "manual" ? "manual" : null;
  const when = new Date(DEMO_NOW_MS).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  return (
    <>
      <h1 className="mt-1 font-sign text-3xl leading-tight">{title}</h1>
      <article className={`mt-4 rounded-3xl border p-5 ${kind === "out" ? "border-rope/50" : "border-uv/50"} bg-night-2`}>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">Bouncer · {when}</p>
        <p className="mt-2 font-sign text-2xl leading-tight">{shared.sign}</p>
        <p className="mt-3 text-2xl tracking-widest" aria-label="Your messages">{squares(shared.grid)}</p>
        <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-chalk/80">{text}</pre>
      </article>
      <div className="mt-5 flex flex-col gap-3">
        <ShareButton text={text} url="/frames/door?id=skyline-social" label={kind === "out" ? "Dare a friend" : "Share it"} shown={shown} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]" />
        <a href="/frames/door?id=skyline-social" className="rounded-2xl border border-chalk/30 py-3 text-center text-sm">That door</a>
        <a href="/frames/home" className="text-center text-sm text-chalk/70 underline decoration-white/20">Tonight&apos;s doors</a>
      </div>
    </>
  );
}

function CardArt({ kind }: { kind: string }) {
  const text = kind === "card-taken"
    ? { sign: "COASTLINE NIGHT", line: "Tonight's cut is taken.", detail: "Guard Yaw Mensah", stamp: { text: "TAKEN", color: "#f2a93b" } }
    : kind === "card-player"
      ? { sign: "AmberQuay", line: "#4 on the board", detail: "6 nights in · 3-day streak", stamp: { text: "GOT IN.", color: "#4fd18b" } }
      : { sign: "SKYLINE SOCIAL", line: "Tonight's pot: 20 tUSDC", detail: "Guard Delroy", stamp: { text: "OPEN", color: "#4fd18b" } };
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const apply = () => setScale(el.clientWidth / 1200);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const size = text.sign.length > 24 ? 52 : text.sign.length > 14 ? 64 : 80;
  return (
    <div ref={box} className="relative mt-4 w-full overflow-hidden" style={{ height: 630 * scale }}>
      <div style={{ width: 1200, height: 630, transform: `scale(${scale})`, transformOrigin: "top left", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0d0a12", color: "#efe8da", padding: 64, backgroundImage: "radial-gradient(circle at 50% 38%, #2a1c3d 0%, #0d0a12 62%)", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 26, letterSpacing: 10, color: "#cfa349" }}>BOUNCER</div>
        <div style={{ marginTop: 28, padding: "22px 52px", border: "6px solid #8f6bff", borderRadius: 28, fontSize: size, color: "#f1eaff", textAlign: "center", boxShadow: "0 0 48px #8f6bff" }}>{text.sign}</div>
        <div style={{ marginTop: 34, fontSize: 36, textAlign: "center", maxWidth: 1000 }}>{text.line}</div>
        <div style={{ marginTop: 14, fontSize: 28, opacity: 0.7, textAlign: "center", maxWidth: 1000 }}>{text.detail}</div>
        <div style={{ marginTop: 36, fontSize: 28, color: text.stamp.color, border: `4px solid ${text.stamp.color}`, padding: "8px 22px", transform: "rotate(-3deg)" }}>{text.stamp.text}</div>
      </div>
    </div>
  );
}
