"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { BillBuilder } from "@/components/play/BillBuilder";
import { Desk } from "@/components/play/Desk";
import { ApprovedStamp, RefusedStamp, TurnedAwayStamp } from "@/components/Stamp";
import { Countdown } from "@/components/Countdown";
import { DoorList } from "@/components/DoorList";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { ShareButton } from "@/components/ShareButton";
import { StreetBar } from "@/components/home/StreetBar";
import { StreetScroll } from "@/components/home/StreetScroll";
import { Blocked } from "@/components/Blocked";
import { HelpButton } from "@/components/help/HelpButton";
import { Tip } from "@/components/help/Tip";
import { tipText } from "@/lib/help";
import { Money } from "@/components/bits";
import { TokenAmount } from "@/components/TokenAmount";
import { cardLook } from "@/lib/card";
import { CLOSED_QUEUE, FULL_QUEUE, SPONSOR_DETAIL, playStop } from "@/lib/door";
import { doorPaths } from "@/lib/door-read";
import { D, E, registerMotion, roll } from "@/lib/motion";
import { lastWord, winWord } from "@/lib/last-word";
import { shareText, winningMessage, type Square } from "@/lib/share-text";
import { shortHash } from "@/lib/stamp";
import { ACCRA_SETTING, STREET_VIEW } from "@/lib/street-setting";
import { CLOSE_NS, CUT, LOCK_NS, openRivals, otherDoors, othersTitle, RIGHT_BILL, RUMOUR, settingFrom, TOKEN, UNLOCK_NS, WRONG_BILL, doorSpec, frontId, makeCard } from "@/lib/demo/world";

const CENTRE_STREET = `(function(){var el=document.currentScript&&document.currentScript.previousElementSibling;if(!el||!el.classList.contains("street-scroll"))return;var ro,done=false;function stop(){done=true;if(ro)ro.disconnect();}function place(){if(done)return;var n=(el.scrollWidth-el.clientWidth)/2;if(n>0){el.scrollLeft=n;stop();}}place();if(!done&&window.ResizeObserver){ro=new ResizeObserver(place);ro.observe(el);if(el.firstElementChild)ro.observe(el.firstElementChild);}setTimeout(stop,10000);})();`;

/** The page's own status lines under the dialogue: guardNotice() and the resend lines in Raid.tsx. */
const NOTICES: Record<string, string> = {
  error: "The door did not answer. No message was used. Try again.",
  "error-model": "The guard did not answer. No message was used. Try again.",
  "error-busy": "The door is busy. No message was used. Try again in a minute.",
  "error-replay": "This raid moved on in another tab or after a refresh. Reload the page to pick it up.",
  "error-full": "Tonight's cut has been taken. Nothing is left to win, and no message was used.",
  resend: "Sending your last message again…",
  "last-reply": "Getting the guard's last reply…",
};

const CHIPS = ["Who's on your list tonight?", "Is anyone still owed from last week?", "Do you take invoices at the door?"];
const SIG = "ab".repeat(32);

export function RaidFrame({ query }: { query: Record<string, string> }) {
  const id = query.id || frontId();
  const spec = doorSpec(id) ?? doorSpec(frontId())!;
  const state = query.state || "gate";
  const paths = doorPaths(spec.id);
  const setting = settingFrom(ACCRA_SETTING, query);
  const card = makeCard(spec, setting);
  const sign = card?.sign ?? spec.id;
  const guard = card?.name || "the guard";

  if (state === "sponsor") {
    return <Blocked kicker="Unavailable" title="You sponsor this door." detail={SPONSOR_DETAIL} href={paths.door} door={sign} />;
  }
  if (state === "other-player" || state === "no-key") {
    // Raid.tsx sets these as door errors; the page shows them through playStop.
    const stop = playStop(state === "no-key" ? "This device cannot keep a key in the passkey." : "This browser holds another player's raid for tonight. Use that player's passkey to continue it.");
    return <Blocked title={stop.title} detail={stop.detail} href={paths.door} retryHref={paths.play} />;
  }
  if (state === "closed") {
    return (
      <Blocked kicker={CLOSED_QUEUE.kicker} title={CLOSED_QUEUE.title} detail={CLOSED_QUEUE.detail} href={paths.door} door={sign}>
        <DoorList title={othersTitle(spec.id)} doors={otherDoors(spec.id)} failed={false} truncated={false} empty="No other door is listed." retryHref={paths.play} token={TOKEN} narrow />
      </Blocked>
    );
  }
  if (state === "taken") {
    return (
      <Blocked kicker={FULL_QUEUE.kicker} title={FULL_QUEUE.title} detail={FULL_QUEUE.detail} href={paths.door} door={sign}>
        <div className="mx-auto max-w-lg px-4">
          <p className="mt-3 text-sm text-chalk/80">
            You got in tonight.{" "}
            <a href={paths.claim} className="chalk-focus font-sign underline decoration-white/20">Your cut</a>
          </p>
        </div>
        <DoorList title={othersTitle(spec.id)} doors={otherDoors(spec.id)} failed={false} truncated={false} empty="No other door is listed." retryHref={paths.play} token={TOKEN} narrow />
      </Blocked>
    );
  }
  if (state === "gate" || state === "reading" || state === "opening") {
    return <Gate sign={sign} setting={setting} look={card ? cardLook(card) : undefined} state={state} playHref={`${paths.play}?state=street`} doorHref={paths.door} passkeyHref={`/frames/passkey?state=create&next=play&door=${encodeURIComponent(spec.id)}`} pot={spec.pot} />;
  }
  return <Raid id={spec.id} sign={sign} guard={guard} setting={setting} look={card ? cardLook(card) : undefined} state={state} paths={paths} />;
}

function Gate({ sign, setting, look, state, playHref, doorHref, passkeyHref, pot }: { sign: string; setting: ReturnType<typeof settingFrom>; look?: ReturnType<typeof cardLook>; state: string; playHref: string; doorHref: string; passkeyHref: string; pot: string }) {
  return (
    <main className="flex min-h-dvh flex-col bg-night text-chalk">
      <h1 className="sr-only">{sign} · the queue</h1>
      <header className="px-4 pt-4">
        <a href={doorHref} className="chalk-focus inline-flex min-h-11 items-center font-sign text-lg">BOUNCER</a>
      </header>
      <div className="relative min-h-[45dvh] flex-1">
        <StreetScroll bar>
          <SceneLife className="absolute inset-0">
            <DoorScene sign={sign} look={look} setting={setting} neighbors className="size-full" viewBox={STREET_VIEW} />
          </SceneLife>
        </StreetScroll>
      </div>
      {state === "gate" ? (
        <div className="mx-auto w-full max-w-md px-4 py-6 text-center">
          <p className="font-sign text-xl">Tonight&apos;s pot · <TokenAmount token={TOKEN} atomic={pot} /></p>
          <p className="mt-1 text-sm text-chalk/80">Free to play with test tokens. Six messages; a bill counts as one.</p>
          <p className="mt-3 text-sm text-chalk/70">Your passkey stays on this device. Clearing this site does not remove it.</p>
          <a href={playHref} className="mt-4 block w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink">Use your device passkey</a>
          <a href={passkeyHref} className="mt-3 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">New here? Create a passkey</a>
        </div>
      ) : (
        <p role="status" className="px-4 py-6 text-center text-sm text-chalk/70">{state === "reading" ? "Reading this browser." : "Opening the door."}</p>
      )}
      <p className="px-4 pb-6 text-center">
        <a href={doorHref} className="chalk-focus inline-flex min-h-11 items-center px-2 text-sm text-chalk/80 underline decoration-white/20">The door</a>
      </p>
    </main>
  );
}

function Raid({ id, sign, guard, setting, look, state, paths }: { id: string; sign: string; guard: string; setting: ReturnType<typeof settingFrom>; look?: ReturnType<typeof cardLook>; state: string; paths: ReturnType<typeof doorPaths> }) {
  const root = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(true);
  const [doorView, setDoorView] = useState(STREET_VIEW);
  const left = state === "chat1" ? 1 : state === "chat3" ? 3 : 6;
  const saying = state === "chat" || state === "chat3" || state === "chat1";
  const refused = state === "refused";
  const ending = state === "in" || state === "out";
  const holding = state === "recording" || state === "not-recorded" || state === "contract";
  const sheet = state.startsWith("bill") || state === "tip-bill" ? "bill" : state === "desk" ? "desk" : null;
  const rivals = openRivals(id);
  const tip = state === "tip-desk" ? "desk" : state === "tip-messages" ? "messages" : state === "tip-bill" ? "bill" : null;
  const heard = state === "street" || state === "desk" || state === "tip-desk";
  const hints = state !== "no-hints";
  // The scene's own first line, shown until the player has heard anything (Raid.tsx).
  const pill = state === "fresh" || state === "no-hints" || state === "help";
  const deskBadge = state === "street" || state === "chat" || state === "chat3" || state === "chat1" || state === "tip-desk";
  const transcript = state === "chat3" || state === "chat1";
  const line = state === "typing" ? "…" : refused ? "Not approved." : saying ? "Send your complete invoice and I'll review it." : holding ? "Approved." : "Evening. Invoice?";

  useLayoutEffect(() => {
    const place = () => {
      const el = scroller.current;
      if (!el) return;
      const next = (el.scrollWidth - el.clientWidth) / 2;
      if (next > 0 && el.scrollLeft === 0) el.scrollLeft = next;
    };
    place();
    const el = scroller.current;
    const ro = el ? new ResizeObserver(place) : null;
    if (el) {
      ro?.observe(el);
      if (el.firstElementChild) ro?.observe(el.firstElementChild);
    }
    registerMotion();
    if (!root.current) return () => ro?.disconnect();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduced) return;
      if (refused) {
        gsap.timeline()
          .fromTo(".redflash", { opacity: 0 }, { opacity: 0.45, duration: 0.06, yoyo: true, repeat: 1 }, 0.05)
          .fromTo(".slam", { scale: 2.6, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.16, ease: E("strike") }, 0)
          .fromTo(".scene", { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.28, ease: "none" }, 0.14)
          .to(".slam", { opacity: 0, duration: 0.3 }, 1.6);
      }
      if (ending) {
        const tl = gsap.timeline();
        tl.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: D.deliberate, ease: E("settle") })
          .fromTo(".end-stamp", { scale: 0.2, rotation: -40, opacity: 0 }, { scale: 1, rotation: -10, opacity: 1, duration: D.cinematic, ease: E("close") }, 0.2)
          .fromTo(".end-title", { y: 24, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: D.move, ease: E("arrive") }, 0.6)
          .fromTo(".end-rest", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: D.arrive, ease: E("arrive"), stagger: 0.09 }, 0.9);
        roll(tl, root.current?.querySelector(".end-cut .tnum") ?? null, 0, 0.9, 1.1);
      }
    }, root);
    return () => {
      ro?.disconnect();
      ctx.revert();
    };
  }, [refused, ending]);

  return (
    <div ref={root} className="relative flex h-dvh flex-col overflow-hidden bg-night text-chalk">
      <h1 className="sr-only">{sign}</h1>
      <header className="z-20 flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:gap-3 sm:px-4">
        <a href={paths.door} className="chalk-focus inline-flex min-h-11 min-w-0 flex-col justify-center leading-none">
          <div className="font-sign text-sm">BOUNCER</div>
          <div className="truncate font-mono text-xs uppercase tracking-wider text-chalk/80 sm:tracking-[0.2em]">{sign} · Round 1</div>
        </a>
        <Squares left={left} />
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-full bg-night-3 px-2 py-1 font-mono text-[11px] min-[380px]:flex">Round 1</span>
          <HelpButton values={{ budget: 6, lockNs: LOCK_NS }} initialOpen={state === "help"} className="relative grid size-7 shrink-0 place-items-center rounded-full bg-night-3 font-sign text-sm after:absolute after:-inset-2 after:content-['']">
            <span aria-hidden="true">?</span>
            <span className="sr-only">How to play</span>
          </HelpButton>
          <button type="button" data-sound-toggle aria-label="Street sound off" aria-pressed={false} className="relative shrink-0 whitespace-nowrap rounded-full bg-night-3 px-2 py-1 font-mono text-[11px] sm:px-2.5 sm:text-xs">♪ sound off</button>
        </div>
      </header>
      <section ref={stageRef} className="scene relative min-h-0 flex-1 overflow-hidden bg-[#140f1c]">
        <StreetSizer stageRef={stageRef} scroller={scroller} setNarrow={setNarrow} setDoorView={setDoorView} />
        <div ref={scroller} className={`street-scroll absolute inset-0 [scrollbar-width:none] ${narrow ? "overflow-x-auto overflow-y-hidden" : "overflow-hidden"}`}>
          <div className={`relative h-full ${narrow ? "w-[240%] min-w-[880px]" : ""}`} style={narrow ? undefined : { width: "100%" }}>
            <SceneLife className="absolute inset-0">
              <DoorScene setting={setting} sign={sign} look={look} gossip speakingSlots={[true]} viewBox={narrow ? STREET_VIEW : doorView} className="absolute inset-0 size-full" />
            </SceneLife>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: CENTRE_STREET }} />
        {narrow ? <StreetBar scroller={scroller} /> : null}
        <div className="redflash pointer-events-none absolute inset-0 bg-rope opacity-0 mix-blend-screen" />
        <div aria-hidden="true" className="slam pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 opacity-0">
          {refused ? <div className="scale-[2.2]"><RefusedStamp /></div> : null}
        </div>
        {pill ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full bg-chalk px-3 py-1.5 text-center text-[12px] font-semibold text-ink shadow-lg">
            {hints ? "Tap a person or use Listen. Listening is free." : "Nobody in this queue has a hint to share."}
          </div>
        ) : null}
        {heard ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-[230px] animate-[fadeIn_.25s_ease-out] rounded-2xl rounded-bl-sm bg-chalk px-3 py-2 text-ink shadow-xl">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/50">Someone in the queue · noted</div>
            <div className="text-[13px] leading-snug">&ldquo;{RUMOUR}&rdquo;</div>
          </div>
        ) : null}
      </section>
      {hints ? (
        <div className="flex items-center gap-2 overflow-x-auto bg-night-2 px-4 py-2" role="group" aria-label="People on the street">
          <span className="shrink-0 font-mono text-xs uppercase text-chalk/75">Street hints</span>
          <a href={`${paths.play}?state=street`} className="chalk-focus min-h-11 shrink-0 rounded-full border border-chalk/60 px-3 text-xs leading-[2.75rem] text-chalk">Listen to Someone in the queue</a>
        </div>
      ) : null}
      <section className="z-20 rounded-t-3xl border-t border-white/10 bg-night-2 px-4 pb-5 pt-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{guard.toUpperCase()}</span>
          <p className="min-h-[2.8rem] flex-1 font-sign text-xl leading-tight">{line === "…" ? <Thinking /> : line}</p>
          {refused ? <RefusedStamp className="shrink-0" /> : null}
          <Wait state={state} />
        </div>
        {NOTICES[state] ? <p role="status" className="mt-2 text-xs text-chalk/80">{NOTICES[state]}</p> : null}
        {transcript ? (
          <details className="mt-2 text-xs text-chalk/70">
            <summary className="cursor-pointer">Conversation on this device</summary>
            <ol className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              <li><p>You: {CHIPS[0]}</p><p>Guard: Send your complete invoice and I&apos;ll review it.</p></li>
            </ol>
          </details>
        ) : null}
        {saying ? (
          <form className="mt-3 space-y-2" onSubmit={(event) => event.preventDefault()}>
            <div className="flex gap-2">
              <input placeholder={`Say something to ${guard}…`} maxLength={200} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-night px-3 py-3 text-[15px] outline-none focus:border-chalk/60" />
              <button className="shrink-0 rounded-xl bg-chalk px-4 font-sign text-ink">Send</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CHIPS.map((chip) => (
                <span key={chip} className="shrink-0 rounded-full border border-chalk/25 px-3 py-1.5 text-[13px] text-chalk/80">{chip}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-chalk/45">
              <span>Each message costs 1 of your 6. Listening and the desk are free.</span>
              <a href={`${paths.play}?state=street`} className="underline">Back</a>
            </div>
          </form>
        ) : (
          <>
          {tip === "desk" || tip === "messages" ? (
            <Tip text={tipText(tip, 6)} onDone={() => window.location.assign(`${paths.play}?state=${tip === "desk" ? "tip-messages" : "street"}`)} className={`mt-3 ${tip === "desk" ? "ml-auto" : ""}`} />
          ) : null}
          <div className="mt-3 grid grid-cols-[1fr_1.3fr_1fr] gap-2">
            <a href={`${paths.play}?state=chat`} className="rounded-2xl border border-chalk/25 py-3 text-center text-sm">Say<span className="block font-mono text-[10px] text-chalk/45">Costs 1 message</span></a>
            <a href={`${paths.play}?state=bill-empty`} className="rounded-2xl bg-chalk py-3 text-center font-sign text-ink shadow-[0_5px_0_#9c9483]">Write a bill<span className="block font-mono text-[10px] font-normal text-ink/50">Costs 1 message</span></a>
            <a href={`${paths.play}?state=desk`} className="relative rounded-2xl border border-chalk/25 py-3 text-center text-sm">Desk<span className="block font-mono text-[10px] text-chalk/45">free</span>{deskBadge ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-uv font-mono text-[10px] text-white">1</span> : null}</a>
          </div>
          </>
        )}
      </section>
      {sheet ? (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60">
          <div className="max-h-[88%] overflow-y-auto">
            {tip === "bill" ? <Tip text={tipText("bill")} onDone={() => window.location.assign(`${paths.play}?state=bill-empty`)} className="mx-4 mb-2" /> : null}
            {sheet === "bill" ? (
              <BillBuilder
                payees={[]}
                payout="chosen when you claim"
                currency="tUSDC"
                venue={sign}
                left={left}
                initial={state === "bill-filled" ? RIGHT_BILL : state === "bill-decimals" ? WRONG_BILL : null}
                decimalsNote={state === "bill-decimals"}
                onSubmit={(bill) => {
                  const right = bill.payee.trim().toLowerCase() === RIGHT_BILL.payee.toLowerCase() && bill.reference.trim().toUpperCase() === RIGHT_BILL.reference && Math.abs(bill.qty * bill.unit - 12.5) < 0.005;
                  window.location.assign(`${paths.play}?state=${right ? "recording" : "refused"}`);
                }}
                onClose={() => window.location.assign(`${paths.play}?state=street`)}
              />
            ) : (
              <Desk notes={[{ id: "rumour", text: RUMOUR, source: "Heard" }]} payees={[]} poster={[]} inside={false} onPin={() => undefined} onMark={() => undefined} onClose={() => window.location.assign(`${paths.play}?state=street`)} />
            )}
          </div>
        </div>
      ) : null}
      {holding ? <Hold state={state} amount={CUT} doorHref={paths.door} retryHref={`${paths.play}?state=recording`} /> : null}
      {state === "out" ? <Turned sign={sign} guard={guard} rivals={rivals} doorHref={paths.door} revealHref={paths.reveal} /> : null}
      {state === "in" ? <GotIn sign={sign} guard={guard} doorHref={paths.door} claimHref={`${paths.claim}?state=locked`} /> : null}
    </div>
  );
}

function StreetSizer({ stageRef, scroller, setNarrow, setDoorView }: { stageRef: RefObject<HTMLElement | null>; scroller: RefObject<HTMLDivElement | null>; setNarrow: (v: boolean) => void; setDoorView: (v: string) => void }) {
  useLayoutEffect(() => {
    const el = stageRef.current;
    const sc = scroller.current;
    if (!el) return;
    const place = () => {
      if (!sc) return;
      const next = (sc.scrollWidth - sc.clientWidth) / 2;
      if (next > 0 && sc.scrollLeft === 0) sc.scrollLeft = next;
    };
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const isNarrow = width < 760;
      setNarrow(isNarrow);
      if (!isNarrow && height > 0) {
        const left = -230;
        const right = 670;
        const bottom = 268;
        const span = right - left;
        const vbH = Math.max(300, span / (width / height));
        setDoorView(`${left} ${(bottom - vbH).toFixed(1)} ${span} ${vbH.toFixed(1)}`);
      }
      place();
    });
    ro.observe(el);
    place();
    return () => ro.disconnect();
  }, [stageRef, scroller, setDoorView, setNarrow]);
  return null;
}

function Squares({ left }: { left: number }) {
  const budget = 6;
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" aria-label={`${left} messages left`}>
      {Array.from({ length: budget }, (_, i) => (
        <span key={i} className={`grid size-4 place-items-center rounded-full border-2 font-sign text-[7px] min-[380px]:size-5 min-[380px]:text-[8px] sm:size-6 sm:text-[9px] ${i < budget - left ? "border-chalk/15 text-chalk/15" : "border-chalk bg-chalk text-ink shadow-[0_0_10px_rgb(239_232_218/0.35)]"}`}>{i + 1}</span>
      ))}
    </div>
  );
}

function Thinking() {
  return (
    <span className="inline-flex items-end gap-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="think-dot inline-block px-px text-[1.35em] leading-none animate-[think_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.18}s` }} aria-hidden>.</span>
      ))}
    </span>
  );
}

function Wait({ state }: { state: string }) {
  if (state === "wait") return <span role="status" className="max-w-[9rem] text-right text-xs text-chalk/70">Waiting for the guard…</span>;
  if (state === "reading-guard") return <span role="status" className="max-w-[9rem] text-right text-xs text-chalk/70">The guard is reading it.<span className="block font-mono text-[10px] text-chalk/50">12s</span></span>;
  if (state === "still") return <span role="status" className="max-w-[9rem] text-right text-xs text-chalk/70">Still reading. This can take up to a minute.<span className="block font-mono text-[10px] text-chalk/50">30s</span></span>;
  return null;
}

function Hold({ state, amount, doorHref, retryHref }: { state: string; amount: string; doorHref: string; retryHref: string }) {
  const sending = state === "recording";
  const retry = state === "not-recorded";
  const message = state === "contract"
    ? "A door's sponsor or the vault owner cannot be paid from it. Sending it again will not change that."
    : "The vault did not record the verdict.";
  return (
    <div role="status" className="absolute inset-0 z-30 flex flex-col items-center justify-end bg-[linear-gradient(to_bottom,rgb(13_10_18/0.35)_0%,rgb(13_10_18/0.92)_25%,rgb(13_10_18/0.99)_45%)] px-6 pb-8 text-center">
      <h1 className="font-sign text-4xl leading-none">Approved.</h1>
      <p className="mt-2 text-2xl text-chalk"><TokenAmount token={TOKEN} atomic={amount} /></p>
      <p className="mt-3 max-w-sm text-sm text-chalk/70">{sending ? "Recording the verdict with the vault…" : `${message} The signed verdict stays on this device.`}</p>
      <p className="mt-2 max-w-sm text-xs text-chalk/55">You are not in until the vault records it.</p>
      <div className="mt-5 flex w-full max-w-sm flex-col gap-3">
        {retry ? <a href={retryHref} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">Send it again</a> : null}
        {sending ? null : <a href={doorHref} className="rounded-2xl border border-chalk/30 py-3 text-sm">The door</a>}
      </div>
    </div>
  );
}

function GotIn({ sign, guard, doorHref, claimHref }: { sign: string; guard: string; doorHref: string; claimHref: string }) {
  const grid: Square[] = ["ask", "ask", "approved", "none", "none", "none"];
  const message = winningMessage(grid);
  const text = shareText({ kind: "in", sign, guard, grid, streak: 3 }, 6);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-end overflow-y-auto bg-[linear-gradient(to_bottom,rgb(13_10_18/0.1)_0%,rgb(13_10_18/0.6)_30%,rgb(13_10_18/0.97)_55%)] px-6 pb-8 text-center">
      <ApprovedStamp signature={SIG} ring={`${sign} · #1 · DOOR · ${shortHash(SIG).toUpperCase()} · `} size={150} className="end-stamp" />
      <h1 className="end-title mt-5 font-sign text-5xl leading-none">You got in.</h1>
      <figure className="end-rest mt-4 max-w-sm">
        <blockquote className="relative rounded-2xl border border-white/20 bg-night-2 px-4 py-3 text-left font-sign text-lg leading-snug text-chalk">
          &ldquo;{winWord("harbour-light")}&rdquo;
          <span aria-hidden className="absolute -top-2 left-8 size-4 rotate-45 border-l border-t border-white/20 bg-night-2" />
        </blockquote>
        <figcaption className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">{guard}, on the door</figcaption>
      </figure>
      <div className="end-rest mt-4 flex items-center gap-1.5" aria-label={message ? `Got in on message ${message} of 6` : "Your messages"}>
        {grid.map((d, i) => <span key={i} className={`size-4 rounded ${d === "approved" ? "bg-uv" : d === "ask" ? "bg-graphite" : "bg-night-3"}`} />)}
        {message ? <span className="ml-2 font-mono text-xs text-chalk/70">in on {message} / 6</span> : null}
      </div>
      <p className="end-rest mt-2 text-sm text-brass">Tonight still counts · 3-day streak · #4 on the board</p>
      <div className="end-rest end-cut mt-4">
        <div className="font-mono text-xs uppercase tracking-[0.25em] text-chalk/80">Your cut</div>
        <Money text="12.5" currency="tUSDC" className="neon-brass text-4xl" />
        <p className="mt-1 text-sm text-chalk/70">The vault has recorded it. Collect in about <Countdown endsAtNs={UNLOCK_NS} className="text-chalk" />.</p>
      </div>
      <div className="end-rest mt-5 flex w-full max-w-sm flex-col gap-3">
        <a href={claimHref} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">Collect when the lock opens</a>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ShareButton text={text} url={doorHref} label="Share your night" className="rounded-2xl border border-chalk/30 px-5 py-3 font-sign" />
        </div>
        <a href="/frames/home" className="text-sm text-chalk/70 underline decoration-white/20">Try another door tonight</a>
      </div>
    </div>
  );
}

function Turned({ sign, guard, rivals, doorHref, revealHref }: { sign: string; guard: string; rivals: ReturnType<typeof openRivals>; doorHref: string; revealHref: string }) {
  const grid: Square[] = ["refused", "ask", "refused", "ask", "refused", "ask"];
  const [first, ...more] = rivals;
  const line = lastWord(first ? { sign: first.sign, guard: first.name || null, pot: null } : null, "harbour-light");
  const dare = shareText({ kind: "out", sign, guard, grid, streak: 3 }, grid.length);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-end overflow-y-auto bg-[linear-gradient(to_bottom,rgb(13_10_18/0.1)_0%,rgb(13_10_18/0.7)_25%,rgb(13_10_18/0.97)_45%)] px-6 pb-8 text-center">
      <div className="end-stamp"><TurnedAwayStamp /></div>
      <figure className="end-title mt-5 max-w-sm">
        <blockquote className="relative rounded-2xl border border-white/20 bg-night-2 px-4 py-3 text-left font-sign text-lg leading-snug text-chalk">
          &ldquo;{line}&rdquo;
          <span aria-hidden className="absolute -top-2 left-8 size-4 rotate-45 border-l border-t border-white/20 bg-night-2" />
        </blockquote>
        <figcaption className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">{guard}, on the door</figcaption>
      </figure>
      <div className="end-rest mt-4 flex items-center gap-1.5" aria-label="6 of 6 messages used">
        {grid.map((d, i) => <span key={i} className={`size-4 rounded ${d === "refused" ? "bg-rope" : "bg-graphite"}`} />)}
        <span className="ml-2 font-mono text-xs text-chalk/70">6 / 6 tried</span>
      </div>
      <p className="end-rest mt-2 text-sm text-brass">Tonight still counts · 3-day streak · #4 on the board</p>
      <div className="end-rest mt-5 flex w-full max-w-sm flex-col gap-3">
        {first ? (
          <a href={first.href} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
            Try {first.sign}
            {first.dayPot ? <span className="block font-mono text-xs uppercase tracking-wider">Tonight&apos;s pot · <TokenAmount token={TOKEN} atomic={first.dayPot} className="text-ink" /></span> : null}
          </a>
        ) : null}
        {more.length ? (
          <div className="grid grid-cols-2 gap-2">
            {more.slice(0, 2).map((door) => (
              <a key={door.id} href={door.href} className="rounded-2xl border border-white/15 px-3 py-2 text-left">
                <span className="block truncate font-sign text-sm">{door.sign}</span>
                {door.dayPot ? <TokenAmount token={TOKEN} atomic={door.dayPot} className="text-xs text-brass" /> : null}
              </a>
            ))}
          </div>
        ) : null}
        <div className="flex justify-center">
          <ShareButton text={dare} url={doorHref} label="Dare a friend" className="rounded-2xl border border-chalk/30 px-5 py-3 font-sign" />
        </div>
        <a href={revealHref} className="rounded-2xl border border-chalk/30 px-4 py-3 text-sm">The ledger opens in <Countdown endsAtNs={CLOSE_NS} className="text-chalk" />. See which bill would have got in.</a>
        <a href="/frames/home" className="text-sm text-chalk/70 underline decoration-white/20">All of tonight&apos;s doors</a>
      </div>
    </div>
  );
}
