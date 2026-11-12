"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { NetworkTag } from "@/components/bits";
import { Countdown } from "@/components/Countdown";
import { ShareButton } from "@/components/ShareButton";
import { TokenAmount, TokenWord } from "@/components/TokenAmount";
import type { ProofBundle } from "@/lib/proof-bundle";
import { proofRows, verifyCommands, type AttestationState, type Row } from "@/lib/proof-rows";
import { shareText, squares, type Square } from "@/lib/share-text";
import { CUT, REAL_WIN, TOKEN, UNLOCK_NS, doorSpec, frontId } from "@/lib/demo/world";
import { doorPaths } from "@/lib/door-read";
import { payoutExplorerUrl } from "@/lib/explorer";

const GRID: Square[] = ["ask", "ask", "approved", "none", "none", "none"];
const HASH = "ab".repeat(32);
const OTHER = "cd".repeat(32);
const CALL = "01234567-89ab-cdef-0123-456789abcdef";
const SIGNER = `0x${"ab".repeat(20)}`;
const OTHER_SIGNER = `0x${"cd".repeat(20)}`;

export function ClaimFrame({ query }: { query: Record<string, string> }) {
  const spec = doorSpec(query.id || frontId()) ?? doorSpec(frontId())!;
  const paths = doorPaths(spec.id);
  const state = query.state || "locked";
  const paid = state === "paid";
  const wallet = state === "paid" || state === "wallet" || state === "sent";
  const guard = spec.name || null;
  // No crack exists yet for a held verdict, a raid this browser does not hold, or one the vault has no record of.
  const crack = !["held", "reading", "missing", "none"].includes(state);
  const ready = state === "ready" || state === "existing" || state === "sponsor";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Payout</p>
          <NetworkTag label="Testnet" className="text-chalk/70" />
        </div>
        <h1 className="mt-2 font-sign text-3xl leading-none">Your cut</h1>
        {crack ? <div className="mt-3"><TokenAmount token={TOKEN} atomic={CUT} className="text-4xl text-brass" /></div> : null}
        {state === "sponsor" ? <p className="mt-4 text-sm text-chalk/70">This passkey&apos;s account sponsors this door, and a door&apos;s sponsor cannot be paid from it. Nothing was sent.</p> : null}
        {state === "held" ? <p className="mt-4 text-sm text-chalk/70">Your bill was approved, but the vault has not recorded it yet. It cannot be claimed until it is.</p> : null}
        {state === "none" ? <p className="mt-4 text-sm text-chalk/70">No crack is recorded for this raid.</p> : null}
        {state === "reading" ? <p className="mt-4 text-sm text-chalk/70">Reading this claim.</p> : null}
        {state === "held" ? <button type="button" className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">Send the verdict again</button> : null}
        {state === "missing" ? <button type="button" className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40">Use your device passkey</button> : null}
        {state === "locked" ? (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5 text-center">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Time lock</div>
            <Countdown endsAtNs={UNLOCK_NS} className="mt-2 text-3xl text-chalk" />
            <p className="mt-2 text-sm text-chalk/60">The vault pays when this lock opens. Other chains stay labelled for later and are not payable here.</p>
          </section>
        ) : null}
        {ready ? (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            {state === "existing" ? (
              <p className="text-sm text-chalk/70">The lock is open. This device&apos;s passkey signs the claim, and the vault pays amber-quay.testnet.</p>
            ) : (
              <TokenWord token={TOKEN}>{(symbol) => <p className="text-sm text-chalk/70">The lock is open. Claim uses a passkey on this device. That account is the payout, and the vault sends the {symbol} there.</p>}</TokenWord>
            )}
            {state === "existing" ? (
              <>
                <input defaultValue="amber-quay.testnet" className="mt-4 w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm" />
                <p className="mt-2 text-sm text-chalk/60">This device&apos;s passkey has to be a full-access key on that account. The account pays the gas.</p>
              </>
            ) : null}
            <a href={`${paths.claim}&state=paying`} className="mt-4 block w-full rounded-2xl bg-chalk py-4 text-center font-sign text-lg text-ink">Claim</a>
            {state === "existing" ? (
              <a href={`${paths.claim}&state=ready`} className="mt-3 block w-full text-center text-sm text-chalk/70 underline decoration-white/20">Use this passkey&apos;s own account</a>
            ) : (
              <a href={`${paths.claim}&state=existing`} className="mt-3 block w-full text-center text-sm text-chalk/70 underline decoration-white/20">Use an account you already have</a>
            )}
          </section>
        ) : null}
        {state === "paying" ? (
          <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
            <p className="font-sign text-2xl">The vault is paying.</p>
            <PaymentLink />
          </section>
        ) : null}
        {paid ? (
          <>
            <Paid sign={spec.sign} guard={guard} doorHref={paths.door} revealHref={paths.reveal} />
            <PaymentLink />
          </>
        ) : null}
        {state === "closed" ? <p className="mt-5 text-sm text-chalk/70">This crack can no longer be claimed.</p> : null}
        {wallet ? <Wallet open={state === "wallet" || state === "sent"} sent={state === "sent"} /> : null}
        {state === "verified" || state === "mismatch" || state === "unchecked" || state === "unpinned" || paid ? <Verified kind={state === "mismatch" ? "bad" : state === "unchecked" ? "unchecked" : state === "unpinned" ? "unpinned" : "ok"} /> : null}
        {crack ? (
          <a href={`${paths.wins}&round=1&raid=demo-raid`} className="chalk-focus mt-4 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
            This win&apos;s public page: anyone can check it there
          </a>
        ) : null}
        <p className="mt-4 font-mono text-xs text-chalk/80">Round 1</p>
        <a href={paths.door} className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">The door</a>
      </div>
    </main>
  );
}

/** The explorer link, to a real testnet payment (REAL_WIN). No hash is invented here. */
function PaymentLink() {
  return (
    <a href={payoutExplorerUrl(REAL_WIN.claimTx) ?? "#"} data-tx={REAL_WIN.claimTx} className="chalk-focus mt-4 inline-flex min-h-11 items-center text-sm text-chalk underline decoration-white/20">
      View the payment
    </a>
  );
}

function Paid({ sign, guard, doorHref, revealHref }: { sign: string; guard: string | null; doorHref: string; revealHref: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState("3.24");
  useLayoutEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(".paid-stamp", { scale: 2.4, rotation: -30, opacity: 0 }, { scale: 1, rotation: -8, opacity: 1, duration: 0.32, ease: "power4.in" })
        .fromTo(ref.current, { x: 0 }, { keyframes: { x: [-5, 4, -2, 0] }, duration: 0.24 })
        .from(".paid-rest", { y: 12, opacity: 0, duration: 0.35, stagger: 0.08 }, "-=0.05");
      const counter = ref.current?.querySelector(".paid-count");
      if (counter) {
        const state = { value: 0 };
        gsap.to(state, { value: 3.24, duration: 1.2, ease: "power2.out", delay: 0.3, onUpdate: () => { counter.textContent = state.value.toFixed(2); setShown(state.value.toFixed(2)); } });
      }
    }, ref);
    return () => ctx.revert();
  }, []);
  const text = shareText({ kind: "paid", sign, guard, grid: GRID, streak: 3, amount: shown }, 6);
  return (
    <section ref={ref} className="mt-6 rounded-3xl border border-brass/40 bg-night-2 p-5 text-center">
      <svg viewBox="0 0 160 60" width="160" height="60" role="img" aria-label="Paid" className="paid-stamp mx-auto">
        <g transform="rotate(-6 80 30)">
          <rect x="4" y="4" width="152" height="52" rx="6" fill="none" stroke="#4fd18b" strokeWidth="4" />
          <text x="80" y="42" textAnchor="middle" fill="#4fd18b" fontFamily="var(--font-bungee)" fontSize="30" letterSpacing="3">PAID</text>
        </g>
      </svg>
      <p className="paid-rest mt-3 font-sign text-4xl text-brass"><span className="paid-count tabular-nums">{shown}</span> <span className="font-mono text-lg">tUSDC</span></p>
      <p className="paid-rest mt-2 text-sm text-chalk/80">{guard ? `${guard} let you in, and the vault paid.` : "You got in, and the vault paid."} It is in your account now.</p>
      <p className="paid-rest mt-2 text-lg tracking-widest" aria-hidden>{squares(GRID)}</p>
      <div className="paid-rest mt-4 flex flex-col gap-3">
        <ShareButton text={text} url={doorHref} label="Share your cut" className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]" />
        <a href="/frames/home" className="rounded-2xl border border-chalk/30 py-3 text-sm">Try another door</a>
        <a href={revealHref} className="text-sm text-chalk/70 underline decoration-white/20">See the ledger when the round closes</a>
      </div>
    </section>
  );
}

function Wallet({ open, sent }: { open: boolean; sent: boolean }) {
  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
      <h2 className="font-sign text-xl">Your wallet</h2>
      <p className="mt-3 text-sm text-chalk/70">{sent ? "3.14 tUSDC" : "3.24 tUSDC"}</p>
      <p className="mt-2 text-sm text-chalk/70">Signed in on this browser. Your wallet was made for this passkey.</p>
      <details className="mt-4 group" open={open}>
        <summary className="chalk-focus inline-flex min-h-11 cursor-pointer items-center text-sm text-chalk/80 underline decoration-white/20">Move your winnings</summary>
        <p className="mt-2 text-sm text-chalk/60">Send the token to another testnet account, or take this account to another wallet. You do not need either to be paid.</p>
        <div className="mt-4">
          <button type="button" className="chalk-focus min-h-11 rounded-2xl border border-chalk/30 px-4 py-2 text-sm">Export the key</button>
          <p className="mt-2 text-sm text-chalk/60">Only for using this account in another wallet. Anyone with this key can spend everything in the account. Never paste it into a site or share it.</p>
        </div>
        <form className="mt-5 space-y-3" onSubmit={(event) => event.preventDefault()}>
          <label className="block text-sm text-chalk/80" htmlFor="payout-to">Send to</label>
          <input id="payout-to" placeholder="name.testnet" className="w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm" />
          <label className="block text-sm text-chalk/80" htmlFor="payout-amount">Amount</label>
          <input id="payout-amount" inputMode="decimal" className="w-full rounded-2xl border border-white/10 bg-night px-3 py-3 font-mono text-sm" />
          <button type="submit" className="chalk-focus min-h-11 w-full rounded-2xl bg-chalk py-3 font-sign text-lg text-ink">Send</button>
          {sent ? <p role="status" className="text-sm text-chalk/80">Sent 0.10 tUSDC to kofi.testnet.</p> : null}
        </form>
      </details>
    </section>
  );
}

const BADGE: Record<Row["status"], { word: string; tone: string }> = {
  ok: { word: "Checked", tone: "border-uv/50 text-chalk" },
  bad: { word: "Does not match", tone: "border-rope/60 text-chalk" },
  unchecked: { word: "Not checked", tone: "border-white/15 text-chalk/70" },
};

function Verified({ kind }: { kind: "ok" | "bad" | "unchecked" | "unpinned" }) {
  const rows = panelRows(kind);
  const bundle = kind === "unchecked" ? null : bundleFor(kind === "unpinned" ? "ok" : kind);
  const commands = verifyCommands(bundle);
  return (
    <section aria-labelledby="verified-heading" className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
      <h2 id="verified-heading" className="font-sign text-2xl">Verified</h2>
      <p className="mt-1 text-sm text-chalk/70">What this page could check about how this win was decided. Nothing is ticked unless it was compared. <a href="/frames/how-it-works#hiw-5" className="chalk-focus underline decoration-white/20">What these checks mean</a></p>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${BADGE[row.status].tone}`}>{BADGE[row.status].word}</span>
              <span className="font-medium">{row.label}</span>
            </div>
            <p className="mt-1 text-chalk/70">{row.detail}</p>
          </li>
        ))}
      </ul>
      {bundle?.preflight ? (
        <p className="mt-4 text-xs text-chalk/70">Model: {bundle.preflight.model}. Attestation report taken when this raid opened, nonce <span className="break-all font-mono">{bundle.preflight.nonce.slice(0, 16)}…</span>, {bundle.preflight.reportBytes.toLocaleString()} bytes, hash <span className="break-all font-mono">{bundle.preflight.reportSha256.slice(0, 16)}…</span>.</p>
      ) : null}
      {bundle?.verdictCall ? <a href={bundle.verdictCall.url} target="_blank" rel="noreferrer" className="chalk-focus mt-4 inline-flex min-h-11 items-center text-sm text-chalk underline decoration-white/20">Read the raw attestation</a> : null}
      {commands.length > 0 ? (
        <details className="mt-3">
          <summary className="chalk-focus min-h-11 cursor-pointer py-2 text-sm text-chalk/80">Check it yourself</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-night p-3 font-mono text-xs text-chalk/80">{commands.join("\n")}</pre>
          <button type="button" className="chalk-focus mt-2 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm">Copy the commands</button>
        </details>
      ) : null}
    </section>
  );
}

function seen(hash: string, output: string) {
  return { call_id: CALL, project_id: "skyline-social", wasm_hash: hash, executed_wasm_sha256: hash, input_hash: hash, output_hash: output, worker_measurement: hash, timestamp: 0, quote_bytes: 1024, quote_sha256: hash };
}

function bundleFor(kind: "ok" | "bad"): ProofBundle {
  const signer = kind === "ok" ? SIGNER : OTHER_SIGNER;
  return {
    verdictCall: { callId: CALL, url: `https://example.invalid/attestations/by-call/${CALL}`, outputSha256: HASH },
    reply: { model: "z-ai/glm-5.3-flash", chatId: "demo-chat", requestSha256: HASH, responseSha256: HASH, signatureText: `z-ai/glm-5.3-flash:${HASH}:${HASH}`, signature: "demo", signingAddress: SIGNER, signingAlgo: "ed25519" },
    preflight: { model: "z-ai/glm-5.3-flash", nonce: "c0ffee11c0ffee11", reportSha256: HASH, reportBytes: 4096, signingAddress: signer, signingAlgo: "ed25519", gatewaySigningAddress: signer },
  };
}

function panelRows(kind: "ok" | "bad" | "unchecked" | "unpinned"): Row[] {
  if (kind === "unchecked") return proofRows({ bundle: null, attestation: { state: "none" }, signature: "none" });
  // A site built without a pinned guard version has nothing to compare the attestation with.
  if (kind === "unpinned") return proofRows({ bundle: bundleFor("ok"), attestation: { state: "unpinned" }, signature: true });
  const attestation: AttestationState = kind === "ok"
    ? { state: "ok", pinned: HASH, value: seen(HASH, HASH) }
    : { state: "ok", pinned: OTHER, value: seen(OTHER, "ee".repeat(32)) };
  return proofRows({ bundle: bundleFor(kind), attestation, signature: kind === "ok" });
}
