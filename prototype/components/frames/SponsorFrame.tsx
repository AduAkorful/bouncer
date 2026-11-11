"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { DoorScene } from "@/components/DoorScene";
import { CloseTime } from "@/components/Countdown";
import { SpecForm } from "@/components/sponsor/SpecForm";
import { cardLook, MAX_NAME, MAX_PITCH, MAX_SIGN, type Card } from "@/lib/card";
import { PARTS, SKINS } from "@/lib/look";
import { SAMPLE_SPEC } from "@/lib/sample-spec";
import { seedRandom } from "@/lib/demo/seed";
import { CLOSE_NS } from "@/lib/demo/world";
import { createBytes, depositFor } from "@/lib/storage-cost";
import { shortUnits } from "@/lib/token";
import { ACCRA_SETTING, PLACES, SETTING_FIELDS, STREET_VIEW, defaultStreet, pieceDrawn, randomSetting, type StreetSetting } from "@/lib/street-setting";

/**
 * A copy of web/components/sponsor/SponsorFlow.tsx, drawn from fixed demo values. Each `?state=` is a moment the real
 * flow reaches; the sections, labels, buttons and messages are the app's own. Nothing here signs or sends.
 */

const YOCTO = 10_000_000_000_000_000_000n;
const ACCOUNT = "harbour-light.testnet";
const VAULT = "harbour-light";

const FAIR = {
  ...SAMPLE_SPEC,
  lines: [{ payee: "Harbour Ice Supply", reference: "ICE-{d4}", item: "crushed ice", qty: { lo: 1, hi: 1 }, unit: { lo: "8", hi: "16" }, paid: false }],
  hint: ["I heard {payee} is still waiting on a payment from tonight."],
};
const FAIL = { ...FAIR, hint: ["Booking {reference}, refund {amount}, payee {payee}."] };
const WARN = { ...FAIR, hint: [] as string[] };

/** Guard fairness texts, as guard/src/spec_check.rs writes them. */
const REPORTS: Record<string, { pass: boolean; failures: string[]; warnings: string[] }> = {
  pass: { pass: true, failures: [], warnings: [] },
  warn: { pass: true, failures: [], warnings: ["There is no hint, so players hear no payable bill on the street."] },
  fail: { pass: false, failures: [`The hint "${FAIL.hint[0]}" hands players the whole bill. Use {ref_head}, {amount_near} or {item} to give a clue instead.`], warnings: [] },
};

/** The page-level notice for a state, as SponsorFlow's run() returns it. */
const NOTICES: Record<string, string> = {
  sample: "The sample bills are public. Replace their payees with your own before sealing.",
};

type Vault = { round: number; pot: string; open: boolean; sealed: boolean; locked: boolean; keeper: string | null; mine: boolean };

/** The vault each state shows in sections 4 and 5. Null before it is created. */
function vaultFor(state: string): Vault | null {
  const base: Vault = { round: 1, pot: "0", open: false, sealed: true, locked: false, keeper: null, mine: true };
  switch (state) {
    case "seal": return { ...base, sealed: false };
    case "fund": return base;
    case "keeper-off": return { ...base, pot: "20" };
    case "keeper-on": return { ...base, pot: "20", keeper: "keeper.harbour-light.testnet" };
    case "launch": return { ...base, pot: "20", keeper: "keeper.harbour-light.testnet" };
    case "status": return { ...base, pot: "20", open: true, locked: true, keeper: "keeper.harbour-light.testnet" };
    case "status-nokeeper": return { ...base, pot: "20", open: true, locked: true };
    case "reclaim": return { ...base, round: 2, pot: "20", locked: true, keeper: null };
    case "readonly": return { ...base, mine: false };
    default: return null;
  }
}

export function SponsorFrame({ query }: { query: Record<string, string> }) {
  const state = query.state || "account";
  const signedOut = state === "account" || state === "account-new" || state === "closed" || state === "unknown";
  const [text, setText] = useState(JSON.stringify(state === "fail" ? FAIL : state === "warn" ? WARN : state === "story" || state === "json" || state === "sample" ? SAMPLE_SPEC : FAIR, null, 2));
  const [card, setCard] = useState<Card>({
    sign: "HARBOUR LIGHT",
    name: "Ama Boateng",
    pitch: "One of my payees changed bank details tonight. Think you can get past me?",
    look: { build: 0, skin: 1, head: 0, outfit: 0, eyewear: 0 },
    setting: state === "setting" ? { ...ACCRA_SETTING, place: PLACES.indexOf("basement") } : ({ ...ACCRA_SETTING } as StreetSetting),
  });
  const [ackHint, setAckHint] = useState(false);
  useEffect(() => {
    const target = state === "setting" ? "street-setting" : ["pass", "warn", "fail"].includes(state) ? "fairness" : ["seal", "create"].includes(state) ? "your-vault" : ["fund", "keeper-on", "keeper-off", "launch", "status", "status-nokeeper", "reclaim"].includes(state) ? "fund-open" : null;
    if (!target) return;
    const go = () => document.getElementById(target)?.scrollIntoView({ block: "start" });
    go();
    const timer = window.setTimeout(go, 400);
    return () => window.clearTimeout(timer);
  }, [state]);

  const box = "rounded-2xl border border-white/10 bg-night-2 p-5";
  const label = "block font-mono text-[11px] uppercase tracking-[0.2em] text-chalk/70";
  const input = "mt-1 w-full rounded-lg border border-white/15 bg-night px-3 py-2 text-sm text-chalk";
  const button = "chalk-focus mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-chalk px-5 py-2 text-center leading-tight font-sign text-ink disabled:opacity-40";

  const availability = state === "closed"
    ? "New sponsor doors are not open yet. Existing sponsors can still connect to manage their doors."
    : state === "unknown"
      ? "We could not check whether new sponsor doors are open. Existing sponsors can still connect to manage their doors."
      : "New sponsor doors are open.";
  const report = REPORTS[state === "setting" || state === "create" ? "pass" : state] ?? null;
  const vault = vaultFor(state);
  const balance = state === "fund" ? "2" : "20";
  const deposit = shortUnits(depositFor(createBytes(VAULT), YOCTO), 24, 4);
  const notice = NOTICES[state] ?? null;
  const potZero = vault ? vault.pot === "0" : true;
  const busyStatus = state === "launch" ? "Getting the guard’s signature…" : null;

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex flex-wrap gap-x-5">
          <a href="/frames/sponsors" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/70 underline decoration-white/20">How sponsoring works</a>
          <a href="/frames/home" className="chalk-focus inline-flex min-h-11 items-center text-sm text-chalk/70 underline decoration-white/20">The door</a>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Sponsor</p>
        <h1 className="font-sign text-3xl leading-tight">Run your own door.</h1>
        <p className="text-sm text-chalk/70">You write the story, fund a pot, and the guard runs your door every night. The story passes through this site&apos;s server and the guard in plaintext, and the draft uses a model. Testnet only.</p>
        <div role="status" className="rounded-xl border border-white/20 px-4 py-3 text-sm text-chalk/90">
          {availability}
          {state === "closed" || state === "unknown" ? <button type="button" className="chalk-focus ml-2 min-h-11 underline">Check again</button> : null}
        </div>
        {notice ? <p role="status" className="rounded-xl border border-white/15 px-4 py-3 text-sm">{notice}</p> : null}

        <section className={box}>
          <h2 className="font-sign text-lg">1 · Your account</h2>
          {signedOut ? (
            <>
              <p className="mt-2 text-sm text-chalk/70">This device&apos;s passkey is your sponsor account. It pays for storage and holds the pot you fund.</p>
              {state === "account-new" ? (
                <>
                  <p className="mt-3 text-sm">No testnet account uses this passkey yet. The site can make one for it, with a little NEAR for gas.</p>
                  <button type="button" className={button}>Make a testnet account for this passkey</button>
                </>
              ) : (
                <>
                  <button type="button" className={button}>Use your device passkey</button>
                  <p className="mt-4 text-sm text-chalk/70">New here? Make a passkey on this device. The site makes a testnet account for it. There is no seed phrase.</p>
                  <button type="button" className="chalk-focus mt-3 inline-flex min-h-11 items-center rounded-2xl border border-chalk/30 px-5 font-sign">Create a passkey</button>
                </>
              )}
            </>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-mono break-all">{ACCOUNT}</p>
              <p className="text-chalk/70">0.0103 NEAR · {balance} tUSDC</p>
              <button type="button" className="chalk-focus min-h-11 text-sm underline">Refresh balances</button>
              <p className="text-chalk/60">You need tUSDC for the pot and a little NEAR for storage. This site does not send you either.</p>
              <p className="text-chalk/70">For test USDC, open the <a className="underline chalk-focus" href="https://faucet.circle.com/" target="_blank" rel="noreferrer">Circle faucet</a>, set Network to NEAR Testnet, and paste the account name above. Complete the faucet verification, then refresh balances after the transfer.</p>
            </div>
          )}
        </section>

        {signedOut ? null : (
          <>
            <section className={box}>
              <h2 className="font-sign text-lg">2 · Your story</h2>
              <label className={label} htmlFor="story">Describe the place and who it owes</label>
              <textarea id="story" className={input} rows={3} maxLength={2000} defaultValue="A harbour club that still owes its ice man." />
              <p className="mt-2 text-xs text-chalk/70">Draft uses your <a className="underline" href="#cap">cap per crack</a> and includes an editable street hint.</p>
              <button type="button" className={button}>Draft it</button>
              <h3 className="mt-4 text-sm text-chalk/80">The door spec. Edit the bills below, or write your own.</h3>
              <SpecForm text={text} currency="tUSDC" onChange={setText} />
              <details className="mt-3" open={state === "json"}>
                <summary className="chalk-focus min-h-11 cursor-pointer py-2 text-sm text-chalk/80">Edit as JSON</summary>
                <label className="sr-only" htmlFor="spec">The door spec as JSON</label>
                <textarea id="spec" className={`${input} font-mono text-xs`} rows={14} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
              </details>
              <p className="mt-2 text-xs text-chalk/60">Amounts are in whole tUSDC. References can use {"{d2} {d3} {d4}"} and {"{n:1-99}"}.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="sign">Sign (required to seal)</label>
                  <input id="sign" aria-describedby="sign-rules" className={input} maxLength={MAX_SIGN} value={card.sign} onChange={(e) => setCard({ ...card, sign: e.target.value.toUpperCase() })} />
                  <p id="sign-rules" className="mt-1 text-xs text-chalk/70">Start with a letter or digit. Use up to {MAX_SIGN} characters: uppercase letters, digits, spaces, or . &apos; &amp; -</p>
                </div>
                <div>
                  <label className={label} htmlFor="gname">Guard&apos;s name</label>
                  <input id="gname" className={input} maxLength={MAX_NAME} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                </div>
              </div>
              <label className={`${label} mt-3`} htmlFor="pitch">Pitch (what players read at the door)</label>
              <input id="pitch" className={input} maxLength={MAX_PITCH} value={card.pitch} onChange={(e) => setCard({ ...card, pitch: e.target.value })} />
              <div className="mt-4 grid items-start gap-4">
                <div className="overflow-hidden rounded-2xl bg-[#1a1424]">
                  <DoorScene sign={card.sign || "YOUR DOOR"} look={cardLook({ ...card, name: card.name || "Guard" })} setting={card.setting} p="sponsor" viewBox={STREET_VIEW} className="aspect-[45/16] h-auto w-full" label="This door's street" />
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["build", "Build", PARTS.build.map((p) => p.label)],
                      ["head", "Head", PARTS.head.map((p) => p.label)],
                      ["eyewear", "Eyewear", PARTS.eyewear.map((p) => p.label)],
                      ["outfit", "Outfit", PARTS.outfit.filter((p) => !p.locked).map((p) => p.label)],
                      ["skin", "Skin", SKINS.map((_, i) => `Tone ${i + 1}`)],
                    ] as const).map(([key, name, options]) => (
                      <div key={key}>
                        <label className={label} htmlFor={`look-${key}`}>{name}</label>
                        <select id={`look-${key}`} className={input} value={card.look[key]} onChange={(e) => setCard({ ...card, look: { ...card.look, [key]: Number(e.target.value) } })}>
                          {options.map((o, i) => <option key={o} value={i}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div id="street-setting" className="mt-4 flex items-center justify-between gap-3">
                    <h3 className="font-sign text-base">Setting</h3>
                    <button type="button" className="chalk-focus min-h-11 rounded-full border border-white/20 px-4 text-sm" onClick={() => setCard({ ...card, setting: randomSetting(seedRandom()) })}>Surprise me</button>
                  </div>
                  <p className="mt-1 text-xs text-chalk/70">Each piece is a choice. They can mix. A door saved before Place existed takes its place from words in its pitch, such as beach or rooftop.</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {SETTING_FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className={label} htmlFor={`setting-${field.key}`}>
                          {field.label}
                          {pieceDrawn(field.key, PLACES[card.setting.place] ?? "street") ? null : <span className="ml-1 text-chalk/50">(not at this place)</span>}
                        </label>
                        <select id={`setting-${field.key}`} className={input} value={card.setting[field.key]} onChange={(e) => setCard({ ...card, setting: { ...card.setting, [field.key]: Number(e.target.value) } })}>
                          {field.options.map((option, i) => <option key={option} value={i}>{option}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  {defaultStreet(card.setting) ? (
                    <p role="note" className="mt-3 text-sm text-chalk/80">Every piece is on its default, so this door will look like every other default door. Pick a Place and a few pieces so players can tell it apart.</p>
                  ) : null}
                  <p className="mt-2 text-xs text-chalk/60">The picture follows these picks. Away from a street front, the place brings its own ride, shop and bar; those picks are kept for when you switch back.</p>
                </div>
              </div>
            </section>

            <section id="fairness" className={box}>
              <h2 className="font-sign text-lg">3 · The fairness test</h2>
              <p className="mt-2 text-sm text-chalk/70">It checks that one honest bill can be paid, a wrong one is refused, and no payable line is easy to guess. The guard will not seal a story that fails it. It cannot tell you the story is good. A door takes a limited number of bills a night, and a busy door means that limit.</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className={label} htmlFor="cap">Cap per crack (tUSDC)</label>
                  <input id="cap" className={input} inputMode="decimal" defaultValue="20" />
                </div>
                <div>
                  <label className={label} htmlFor="lock">Lock (min)</label>
                  <input id="lock" className={input} inputMode="numeric" defaultValue="10" />
                </div>
                <div>
                  <label className={label} htmlFor="cracks">Cracks a night</label>
                  <input id="cracks" className={input} inputMode="numeric" defaultValue="1" />
                </div>
              </div>
              {/* The live registry limits on testnet: max cap 50 tUSDC, max 4 cracks (set_limits, 4 Nov). */}
              <p className="mt-2 text-xs text-chalk/60">Sponsors may set a cap up to 50 tUSDC and up to 4 cracks.</p>
              <button type="button" className={button}>Run the test</button>
              {report ? (
                <div className="mt-4 space-y-2 text-sm" aria-live="polite">
                  <p className="font-sign">{report.pass ? "Passed." : "Not yet."}</p>
                  {report.failures.map((f) => <p key={f} className="text-rope">{f}</p>)}
                  {report.warnings.map((w) => <p key={w} className="text-brass">{w}</p>)}
                </div>
              ) : null}
            </section>

            <section id="your-vault" className={box}>
              <h2 className="font-sign text-lg">4 · Your vault</h2>
              <label className={label} htmlFor="vid">Vault id</label>
              <input id="vid" className={input} defaultValue={state === "readonly" ? "labadi-tide" : VAULT} placeholder="rusty-anchor" />
              {!vault ? (
                <>
                  <p className="mt-2 text-xs text-chalk/70">Creating it stores the vault on chain. About {deposit} NEAR is held for that storage, plus gas. The id cannot be changed later.</p>
                  <button type="button" className={button} disabled={!report?.pass}>Create the vault</button>
                </>
              ) : !vault.mine ? (
                <p className="mt-3 text-sm">
                  Round {vault.round} · closed. This vault belongs to another sponsor, so it is shown read-only.{" "}
                  <a className="underline decoration-white/30" href="/frames/door?id=labadi-tide">See the door</a>
                </p>
              ) : (
                <p className="mt-3 text-sm">
                  Round {vault.round} · pot {vault.pot} tUSDC · {vault.open ? "open" : "closed"}
                  {vault.sealed ? " · story sealed" : ""}
                  {vault.open ? <CloseTime endsAtNs={CLOSE_NS} prefix=" · closes at" className="text-chalk/70" /> : null}
                  {vault.open && !vault.keeper ? <span className="mt-1 block text-xs text-chalk/60">The keeper is off, so this door will not open again after tonight unless you open it here.</span> : null}
                </p>
              )}
              {!vault && !report?.pass ? <p className="mt-2 text-xs text-chalk/60">Pass the test first.</p> : null}
              {vault && vault.mine && !vault.sealed ? (
                <>
                  <label className="mt-4 flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1" checked={ackHint} onChange={(e) => setAckHint(e.target.checked)} />
                    <span>The hints give players clues about a bill that will be paid. I want that.</span>
                  </label>
                  <button type="button" className={button} disabled={!ackHint}>Seal the story onto the vault</button>
                </>
              ) : null}
              {vault && vault.sealed && !vault.locked ? <p className="mt-2 text-xs text-chalk/60">The story is fixed once the first round opens.</p> : null}
            </section>

            {vault && vault.mine && vault.sealed ? (
              <section id="fund-open" className={box}>
                <h2 className="font-sign text-lg">5 · Fund and open</h2>
                <button type="button" className="chalk-focus mt-2 min-h-11 text-sm underline">Refresh balances and vault</button>
                {busyStatus ? <p role="status" className="mt-2 text-sm text-chalk/80">{busyStatus}</p> : null}
                <label className={label} htmlFor="fund">Amount (tUSDC)</label>
                <input id="fund" className={input} inputMode="decimal" defaultValue="20" />
                <button type="button" className={button}>Fund the vault</button>
                {state === "fund" ? <p role="status" className="mt-2 text-sm">The account holds 2 tUSDC, and this needs 20 tUSDC. Add tUSDC to the account, then refresh balances. The Circle faucet steps are under the balances.</p> : null}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">Open each night for me</p>
                    <p className="text-xs text-chalk/60">A keeper account can open and close rounds. It cannot move funds.</p>
                    {vault.keeper ? <p className="break-all text-xs text-chalk/80">{vault.keeper}</p> : null}
                  </div>
                  <button type="button" className="chalk-focus min-h-11 rounded-full border border-white/20 px-4 text-sm" aria-pressed={vault.keeper !== null}>{vault.keeper ? "On" : "Off"}</button>
                </div>
                {!vault.open ? (
                  <>
                    <button type="button" className={button} disabled={potZero || state === "launch"}>{vault.locked ? "Start tonight" : "Open the first round"}</button>
                    {potZero ? <p className="mt-2 text-xs text-chalk/60">Fund the vault first. A round with no pot would pay nobody.</p> : null}
                  </>
                ) : (
                  <p className="mt-4 text-sm">The door is open. <a className="underline decoration-white/30" href={`/frames/door?id=${VAULT}`}>See it</a></p>
                )}
                {!vault.open && !potZero ? <button type="button" className="chalk-focus mt-3 text-sm text-chalk/70 underline decoration-white/20">Take the pot back</button> : null}
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
