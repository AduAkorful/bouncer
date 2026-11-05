"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiPost } from "@/lib/api";
import { buildCard, MAX_NAME, MAX_PITCH, MAX_SIGN, type Card } from "@/lib/card";
import { httpRpc } from "@/lib/chain";
import { PARTS, SKINS } from "@/lib/look";
import { preflightCommit, preflightCreate, preflightFund, preflightKeeper, preflightReclaim, preflightSetSpec, validVaultId, type Check, type Funds } from "@/lib/preflight";
import { chainNowNs, connectSponsor, readChain, readFunds, readVault, vaultRegistered, type Chain, type Sponsor } from "@/lib/sponsor-client";
import { sponsorAvailability, type SponsorAvailability } from "@/lib/sponsor-availability";
import { sponsorStep } from "@/lib/sponsor-state";
import { runSponsorAction, sponsorDetail } from "@/lib/sponsor-action";
import { createBytes, depositFor, specBytes } from "@/lib/storage-cost";
import { fromBaseUnits, toBaseUnits } from "@/lib/token";
import { commitRound, createSponsorVault, fund, reclaim, setKeeper, setSpec, type Call } from "@/lib/vault-calls";
import type { VaultView } from "@/lib/vault";

type Props = { rpcUrl: string; contractId: string; networkId: string; storageName: string; keeperAccount: string | null };

const SAMPLE_SPEC = {
  v: 1,
  salt: "",
  decimals: 6,
  guard: { voice: "Dry and tired. Polite, and never says why." },
  lines: [
    { payee: "Coastline Drinks", reference: "CD-{d4}", item: "bar delivery", qty: { lo: 1, hi: 1 }, unit: { lo: "40", hi: "120" }, paid: false },
    { payee: "Tunde Adeyemi", reference: "", item: "security shifts", qty: { lo: 1, hi: 3 }, unit: { lo: "60", hi: "60" }, paid: true },
  ],
  chips: [{ ask: "Who is on the list?", reply: "The list stays with me." }],
  hint: "They cancelled a table. Booking {reference}, refund {amount}, payee {payee}.",
};

const randomSalt = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");

export function SponsorFlow({ rpcUrl, contractId, networkId, storageName, keeperAccount }: Props) {
  const rpc = useMemo(() => httpRpc(rpcUrl), [rpcUrl]);
  const [availability, setAvailability] = useState<SponsorAvailability | "loading">("loading");
  const [availabilityCheck, setAvailabilityCheck] = useState(0);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [funds, setFunds] = useState<Funds | null>(null);
  const [vaultId, setVaultId] = useState("");
  const [vault, setVault] = useState<VaultView | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  const [readNotice, setReadNotice] = useState<string | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let active = true;
    void sponsorAvailability(rpc, contractId).then((result) => { if (active) setAvailability(result); });
    return () => { active = false; };
  }, [rpc, contractId, availabilityCheck]);

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [notice]);

  const [story, setStory] = useState("");
  const [specText, setSpecText] = useState(() => JSON.stringify({ ...SAMPLE_SPEC, salt: "" }, null, 2));
  const [card, setCard] = useState<Card>({ sign: "", name: "", pitch: "", look: { build: 0, skin: 1, head: 0, outfit: 0, eyewear: 0 } });
  const [capText, setCapText] = useState("20");
  const [lockMinutes, setLockMinutes] = useState("10");
  const [maxCracks, setMaxCracks] = useState("1");
  const [report, setReport] = useState<{ pass: boolean; failures: string[]; warnings: string[] } | null>(null);
  const [fundText, setFundText] = useState("20");
  const [ackHint, setAckHint] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bouncer.sponsor.vault");
      if (saved && validVaultId(saved)) setVaultId(saved);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!sponsor || !chain) return;
    try {
      const [f, v] = await Promise.all([
        readFunds(rpc, rpcUrl, chain.tokenId, sponsor.accountId),
        vaultId && validVaultId(vaultId) ? readVault(rpc, contractId, vaultId) : Promise.resolve({ ok: true as const, vault: null }),
      ]);
      setFunds(f);
      if (v.ok) setVault(v.vault);
      setReadNotice(!v.ok ? "The vault did not answer." : !f ? "The balances did not answer." : null);
    } catch {
      setFunds(null);
      setReadNotice("The balances and vault could not be refreshed. Try again.");
    }
  }, [sponsor, chain, rpc, rpcUrl, contractId, vaultId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (work: () => Promise<string | null>) => {
    await runSponsorAction(work, { busy: setBusy, notice: (text) => setNotice(text === null ? null : { text }) });
    await refresh();
  };

  const connect = () =>
    run(async () => {
      const result = await connectSponsor({ rpcUrl, networkId, storageName });
      if (!result.ok) return result.error;
      const read = await readChain(rpc, rpcUrl, contractId);
      if (!read.ok) return read.error;
      setSponsor(result.sponsor);
      setChain(read.chain);
      return null;
    });

  const sendChecked = async (check: Check, build: () => { ok: true; call: Call } | { ok: false; error: string }, done: string) => {
    if (!sponsor) return "Connect this phone first.";
    if (!check.ok) return check.error;
    const built = build();
    if (!built.ok) return "That value could not be sent.";
    const sent = await sponsor.send(built.call);
    return sent.ok ? done : sent.error;
  };

  const step = sponsorStep({ accountId: sponsor?.accountId ?? null, vault });
  const decimals = chain?.token.decimals ?? 6;
  const symbol = chain?.token.symbol ?? "";
  const nothing = !funds;
  const hasHint = (() => {
    try {
      return (JSON.parse(specText) as { hint?: unknown }).hint !== undefined;
    } catch {
      return false;
    }
  })();

  async function draft() {
    await run(async () => {
      const answer = await apiPost("/sponsor/draft", { story, decimals }, sponsor?.authHeaders("/sponsor/draft"));
      const body = (answer.ok ? answer.body : null) as { ok?: boolean; spec?: unknown; detail?: string; error?: string } | null;
      if (!body?.ok || !body.spec || typeof body.spec !== "object" || Array.isArray(body.spec)) return sponsorDetail(body, "The draft did not come back. Write it by hand or try again.");
      setSpecText(JSON.stringify(body.spec, null, 2));
      setReport(null);
      return "Draft ready. Read it, edit it, then run the test.";
    });
  }

  function parsedSpec(): Record<string, unknown> | null {
    try {
      const spec = JSON.parse(specText) as Record<string, unknown>;
      spec.decimals = decimals;
      if (typeof spec.salt !== "string" || spec.salt.length !== 32) spec.salt = randomSalt();
      return spec;
    } catch {
      return null;
    }
  }

  async function test() {
    await run(async () => {
      const spec = parsedSpec();
      const cap = toBaseUnits(capText, decimals);
      if (!spec) return "The story is not valid JSON.";
      if (cap === null || cap <= 0n) return "Enter a cap above zero.";
      const answer = await apiPost("/sponsor/check", { spec, cap: cap.toString() }, sponsor?.authHeaders("/sponsor/check"));
      const body = (answer.ok ? answer.body : null) as { ok?: boolean; pass?: boolean; failures?: string[]; warnings?: string[]; detail?: string } | null;
      if (!body?.ok || typeof body.pass !== "boolean" || !Array.isArray(body.failures) || !body.failures.every((f) => typeof f === "string") || !Array.isArray(body.warnings) || !body.warnings.every((w) => typeof w === "string")) return sponsorDetail(body, "The test did not run. Try again.");
      setSpecText(JSON.stringify(spec, null, 2));
      setReport({ pass: body.pass === true, failures: body.failures ?? [], warnings: body.warnings ?? [] });
      return null;
    });
  }

  async function create() {
    await run(async () => {
      if (!chain || !funds || !sponsor) return "Connect this phone first.";
      const cap = toBaseUnits(capText, decimals);
      const lockNs = BigInt(Math.round(Number(lockMinutes) * 60)) * 1_000_000_000n;
      const cracks = Number(maxCracks);
      if (cap === null || !Number.isFinite(Number(lockMinutes)) || !Number.isInteger(cracks)) return "Check the cap, the lock, and the number of cracks.";
      const deposit = depositFor(createBytes(vaultId), chain.byteCost);
      const check = preflightCreate({ limits: chain.limits, vaultId, cap, lockNs, maxCracks: cracks, exists: vault !== null, depositYocto: deposit, funds });
      const result = await sendChecked(check, () => createSponsorVault(contractId, { vaultId, rule: "PayTheBill", cap, lockNs, maxCracks: cracks }, deposit), "Vault created.");
      if (result === "Vault created.") window.localStorage.setItem("bouncer.sponsor.vault", vaultId);
      return result;
    });
  }

  async function seal() {
    await run(async () => {
      if (!chain || !funds || !sponsor || !vault) return "Create the vault first.";
      const spec = parsedSpec();
      if (!spec) return "The story is not valid JSON.";
      const builtCard = buildCard(card, chain.limits.maxCard);
      if (!builtCard.ok) return builtCard.error;
      const capUnits = toBaseUnits(capText, decimals);
      if (capUnits === null || capUnits <= 0n) return "Enter a cap above zero.";
      if (spec.hint !== undefined && !ackHint) return "Confirm the hint first.";
      const sealed = await apiPost("/sponsor/seal", { vault_id: vaultId, spec, cap: capUnits.toString(), ack_hint: ackHint }, sponsor.authHeaders("/sponsor/seal"));
      const body = (sealed.ok ? sealed.body : null) as { ok?: boolean; spec_ct?: string; spec_hash?: string; detail?: string } | null;
      if (!body?.ok || typeof body.spec_ct !== "string" || typeof body.spec_hash !== "string") return sponsorDetail(body, "The story could not be sealed.");
      const ctBytes = body.spec_ct.length / 2;
      const deposit = depositFor(specBytes(ctBytes, builtCard.text, vaultId), chain.byteCost);
      const check = preflightSetSpec({ limits: chain.limits, vault, accountId: sponsor.accountId, ctBytes, card: builtCard.text, depositYocto: deposit, funds });
      const spec_ct = body.spec_ct;
      const spec_hash = body.spec_hash;
      return sendChecked(check, () => setSpec(contractId, { vaultId, specCtHex: spec_ct, specHashHex: spec_hash, card: builtCard.text }, deposit), "Story sealed onto the vault.");
    });
  }

  async function addFunds() {
    await run(async () => {
      if (!chain || !funds || !sponsor || !vault) return "Create the vault first.";
      const amount = toBaseUnits(fundText, decimals);
      if (amount === null) return "Enter an amount with at most " + decimals + " decimals.";
      const registered = await vaultRegistered(rpc, chain.tokenId, contractId);
      const check = preflightFund({ vault, accountId: sponsor.accountId, amount, funds, vaultRegistered: registered });
      return sendChecked(check, () => fund(chain.tokenId, contractId, vaultId, amount), "Funded.");
    });
  }

  async function toggleKeeper(on: boolean) {
    await run(async () => {
      if (!vault || !sponsor) return "Create the vault first.";
      if (on && !keeperAccount) return "No keeper account is set for this site.";
      return sendChecked(preflightKeeper({ vault, accountId: sponsor.accountId }), () => setKeeper(contractId, vaultId, on ? keeperAccount : null), on ? "The keeper will open each night." : "The keeper is off.");
    });
  }

  async function launch() {
    await run(async () => {
      if (!chain || !vault || !sponsor) return "Create the vault first.";
      const signed = await apiPost("/sponsor/commit", { vault_id: vaultId }, sponsor.authHeaders("/sponsor/commit"));
      const body = (signed.ok ? signed.body : null) as { ok?: boolean; commitment?: string; guard_version?: string; signature?: string; error?: string } | null;
      if (!body?.ok || !body.commitment || !body.guard_version || !body.signature) return typeof body?.error === "string" && body.error.length > 3 && !/^[a-z ]+$/.test(body.error) ? body.error : "The guard did not sign this round.";
      const now = await chainNowNs(rpcUrl);
      if (now === null) return "The chain's time could not be read.";
      const check = preflightCommit({ limits: chain.limits, vault, owner: chain.owner, accountId: sponsor.accountId, nowNs: now, opensAtNs: now, hasSignature: true });
      const commitment = body.commitment;
      const guardVersion = body.guard_version;
      const signature = body.signature;
      return sendChecked(check, () => commitRound(contractId, { vaultId, commitmentHex: commitment, guardVersionHex: guardVersion, opensAtNs: now, signatureHex: signature }), "The door is open.");
    });
  }

  async function takeBack() {
    await run(async () => {
      if (!vault || !sponsor) return "Create the vault first.";
      return sendChecked(preflightReclaim({ vault, accountId: sponsor.accountId }), () => reclaim(contractId, vaultId), "The pot is on its way back to you.");
    });
  }

  const box = "rounded-2xl border border-white/10 bg-night-2 p-5";
  const label = "block font-mono text-[11px] uppercase tracking-[0.2em] text-chalk/70";
  const input = "mt-1 w-full rounded-lg border border-white/15 bg-night px-3 py-2 text-sm text-chalk";
  const button = "chalk-focus mt-4 inline-flex min-h-11 items-center rounded-2xl bg-chalk px-5 font-sign text-ink disabled:opacity-40";

  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/home" className="text-sm text-chalk/70 underline decoration-white/20">
          The door
        </Link>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Sponsor</p>
        <h1 className="font-sign text-3xl leading-tight">Run your own door.</h1>
        <p className="text-sm text-chalk/70">
          You write the story, fund a pot, and the guard runs your door every night. The story passes through this site&apos;s server and the guard in plaintext, and the draft uses a model. Testnet only.
        </p>
        {availability !== "open" ? (
          <div role="status" className="rounded-xl border border-white/20 px-4 py-3 text-sm text-chalk/90">
            {availability === "loading" ? "Checking whether new sponsor doors are open…" : availability === "closed" ? "New sponsor doors are not open yet. Existing sponsors can still connect to manage their doors." : "We could not check whether new sponsor doors are open. Existing sponsors can still connect to manage their doors."}
            {availability !== "loading" ? <button className="chalk-focus ml-2 min-h-11 underline" onClick={() => { setAvailability("loading"); setAvailabilityCheck((n) => n + 1); }}>Check again</button> : null}
          </div>
        ) : null}
        {busy ? <p role="status" className="text-sm text-chalk/80">Working on this step…</p> : null}
        {notice ? <p ref={noticeRef} role="status" className="rounded-xl border border-white/15 px-4 py-3 text-sm">{notice.text}</p> : null}
        {readNotice ? <p role="status" className="text-sm text-chalk/70">{readNotice}</p> : null}

        <section className={box}>
          <h2 className="font-sign text-lg">1 · Your account</h2>
          {!sponsor ? (
            <>
              <p className="mt-2 text-sm text-chalk/70">This phone&apos;s passkey is your sponsor account. It pays for storage and holds the pot you fund.</p>
              <button className={button} disabled={busy} onClick={() => void connect()}>
                Use this phone&apos;s passkey
              </button>
            </>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-mono break-all">{sponsor.accountId}</p>
              <p className="text-chalk/70">
                {nothing ? (readNotice ? "Balances unavailable." : "Reading balances…") : `${fromBaseUnits(funds.nearYocto, 24)} NEAR · ${fromBaseUnits(funds.tokenUnits, decimals)} ${symbol}`}
              </p>
              <p className="text-chalk/60">You need {symbol} for the pot and a little NEAR for storage. This site does not send you either.</p>
            </div>
          )}
        </section>

        {sponsor && chain ? (
          <>
            <section className={box}>
              <h2 className="font-sign text-lg">2 · Your story</h2>
              <label className={label} htmlFor="story">Describe the place and who it owes</label>
              <textarea id="story" className={input} rows={3} maxLength={2000} value={story} onChange={(e) => setStory(e.target.value)} />
              <button className={button} disabled={busy || story.trim().length === 0} onClick={() => void draft()}>
                Draft it
              </button>
              <label className={`${label} mt-4`} htmlFor="spec">The door spec. Edit it or write your own.</label>
              <textarea id="spec" className={`${input} font-mono text-xs`} rows={14} value={specText} onChange={(e) => { setSpecText(e.target.value); setReport(null); }} spellCheck={false} />
              <p className="mt-2 text-xs text-chalk/60">Amounts are in whole {symbol}. References can use {"{d2} {d3} {d4}"} and {"{n:1-99}"}.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="sign">Sign</label>
                  <input id="sign" className={input} maxLength={MAX_SIGN} value={card.sign} onChange={(e) => setCard({ ...card, sign: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className={label} htmlFor="gname">Guard&apos;s name</label>
                  <input id="gname" className={input} maxLength={MAX_NAME} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                </div>
              </div>
              <label className={`${label} mt-3`} htmlFor="pitch">Pitch (what players read at the door)</label>
              <input id="pitch" className={input} maxLength={MAX_PITCH} value={card.pitch} onChange={(e) => setCard({ ...card, pitch: e.target.value })} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(
                  [
                    ["build", "Build", PARTS.build.map((p) => p.label)],
                    ["head", "Head", PARTS.head.map((p) => p.label)],
                    ["eyewear", "Eyewear", PARTS.eyewear.map((p) => p.label)],
                    ["outfit", "Outfit", PARTS.outfit.filter((p) => !p.locked).map((p) => p.label)],
                    ["skin", "Skin", SKINS.map((_, i) => `Tone ${i + 1}`)],
                  ] as const
                ).map(([key, name, options]) => (
                  <div key={key}>
                    <label className={label} htmlFor={`look-${key}`}>{name}</label>
                    <select id={`look-${key}`} className={input} value={card.look[key]} onChange={(e) => setCard({ ...card, look: { ...card.look, [key]: Number(e.target.value) } })}>
                      {options.map((o, i) => (
                        <option key={o} value={i}>{o}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>

            <section className={box}>
              <h2 className="font-sign text-lg">3 · The fairness test</h2>
              <p className="mt-2 text-sm text-chalk/70">It checks that one honest bill can be paid, a wrong one is refused, and no payable line is easy to guess. The guard will not seal a story that fails it. It cannot tell you the story is good. A door takes a limited number of bills a night, and a busy door means that limit.</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className={label} htmlFor="cap">Cap per crack ({symbol})</label>
                  <input id="cap" className={input} inputMode="decimal" value={capText} onChange={(e) => { setCapText(e.target.value); setReport(null); }} />
                </div>
                <div>
                  <label className={label} htmlFor="lock">Lock (min)</label>
                  <input id="lock" className={input} inputMode="numeric" value={lockMinutes} onChange={(e) => setLockMinutes(e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="cracks">Cracks a night</label>
                  <input id="cracks" className={input} inputMode="numeric" value={maxCracks} onChange={(e) => setMaxCracks(e.target.value)} />
                </div>
              </div>
              <p className="mt-2 text-xs text-chalk/60">
                Sponsors may set a cap up to {fromBaseUnits(BigInt(chain.limits.maxCap), decimals)} {symbol} and up to {chain.limits.maxCracks} cracks.
              </p>
              <button className={button} disabled={busy} onClick={() => void test()}>
                Run the test
              </button>
              {report ? (
                <div className="mt-4 space-y-2 text-sm" aria-live="polite">
                  <p className="font-sign">{report.pass ? "Passed." : "Not yet."}</p>
                  {report.failures.map((f) => (
                    <p key={f} className="text-rope">{f}</p>
                  ))}
                  {report.warnings.map((w) => (
                    <p key={w} className="text-brass">{w}</p>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={box}>
              <h2 className="font-sign text-lg">4 · Your vault</h2>
              <label className={label} htmlFor="vid">Vault id</label>
              <input id="vid" className={input} value={vaultId} onChange={(e) => setVaultId(e.target.value.trim())} placeholder="rusty-anchor" />
              {!vault ? (
                <button className={button} disabled={busy || !report?.pass || !validVaultId(vaultId)} onClick={() => void create()}>
                  Create the vault
                </button>
              ) : (
                <p className="mt-3 text-sm">
                  Round {vault.round} · pot {fromBaseUnits(BigInt(vault.pot) + BigInt(vault.dayPot), decimals)} {symbol} · {vault.open ? "open" : "shut"}
                  {vault.specHash ? " · story sealed" : ""}
                </p>
              )}
              {!vault && !report?.pass ? <p className="mt-2 text-xs text-chalk/60">Pass the test first.</p> : null}
              {vault && step === "seal" ? (
                <>
                  {hasHint ? (
                    <label className="mt-4 flex items-start gap-3 text-sm">
                      <input type="checkbox" className="mt-1" checked={ackHint} onChange={(e) => setAckHint(e.target.checked)} />
                      <span>The hint tells every player one bill that will be paid. I want that.</span>
                    </label>
                  ) : null}
                  <button className={button} disabled={busy || !report?.pass || (hasHint && !ackHint)} onClick={() => void seal()}>
                    Seal the story onto the vault
                  </button>
                </>
              ) : null}
              {vault && !vault.specLocked && vault.specHash ? <p className="mt-2 text-xs text-chalk/60">The story is fixed once the first round opens.</p> : null}
            </section>

            {vault && vault.specHash ? (
              <section className={box}>
                <h2 className="font-sign text-lg">5 · Fund and open</h2>
                <label className={label} htmlFor="fund">Amount ({symbol})</label>
                <input id="fund" className={input} inputMode="decimal" value={fundText} onChange={(e) => setFundText(e.target.value)} />
                <button className={button} disabled={busy} onClick={() => void addFunds()}>
                  Fund the vault
                </button>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">Open each night for me</p>
                    <p className="text-xs text-chalk/60">A keeper account can open and close rounds. It cannot move funds.</p>
                  </div>
                  <button
                    className="chalk-focus min-h-11 rounded-full border border-white/20 px-4 text-sm disabled:opacity-40"
                    disabled={busy || !keeperAccount}
                    aria-pressed={vault.keeper !== null}
                    onClick={() => void toggleKeeper(vault.keeper === null)}
                  >
                    {vault.keeper ? "On" : "Off"}
                  </button>
                </div>
                {!vault.open ? (
                  <button className={button} disabled={busy} onClick={() => void launch()}>
                    {vault.specLocked ? "Start tonight" : "Open the first round"}
                  </button>
                ) : (
                  <p className="mt-4 text-sm">
                    The door is open.{" "}
                    <Link className="underline decoration-white/30" href={`/v/${vaultId}`}>
                      See it
                    </Link>
                  </p>
                )}
                {!vault.open && BigInt(vault.pot) > 0n ? (
                  <button className="chalk-focus mt-3 text-sm text-chalk/70 underline decoration-white/20 disabled:opacity-40" disabled={busy} onClick={() => void takeBack()}>
                    Take the pot back
                  </button>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
