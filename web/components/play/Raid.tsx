"use client";

import { cardLook, type Card } from "@/lib/card";
import { apiPost, asObject } from "@/lib/api";

import gsap from "gsap";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Countdown } from "@/components/Countdown";
import { DemoBadge, Money } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { StreetBar } from "@/components/home/StreetBar";
import { StreetScroll } from "@/components/home/StreetScroll";
import { OfficeScene } from "@/components/OfficeScene";
import { BillBuilder } from "@/components/play/BillBuilder";
import { Desk, type Note } from "@/components/play/Desk";
import { ApprovedStamp, RefusedStamp } from "@/components/Stamp";
import { TokenBridge } from "@/components/TokenAmount";
import type { DraftBill } from "@/lib/bill";

type Decision = "ask" | "refused" | "approved" | "none";
import { Blocked } from "@/components/Blocked";
import { doorTitle, playableRaid, playerDetail, playGateStatus, playStop } from "@/lib/door";
import { resumeRaid, postPlayerSession } from "@/lib/player-session";
import type { VaultView } from "@/lib/vault";
import { guardRule } from "@/lib/rules";
import type { TokenRead } from "@/lib/page-vault";
import { TOKEN_FAILED, TOKEN_READING, tokenAmount } from "@/lib/token-label";
import { decimalToAtomic } from "@/lib/units";
import { deriveSecrets } from "@/lib/device-pass";
import { readHold, unlockHeld } from "@/lib/player-hold";
import { loadRaid, raidFromDevice, saveRaid, loadTranscript, saveTranscript, type StoredRaid } from "@/lib/session-store";
import type { Exchange } from "@/lib/raid-transcript";
import { readStreet } from "@/lib/street";
import { ACCRA_SETTING, pieceLearn, soundCity, STREET_VIEW } from "@/lib/street-setting";
import { beatGlow, parallax, startIdle } from "@/lib/idle";
import { D, E, registerMotion, roll } from "@/lib/motion";
import { rigTo, rigTween } from "@/lib/rigMotion";
import { babble, music, setCity as setSoundCity, setSound, sfx, VOICES } from "@/lib/sfx";
import { shortHash } from "@/lib/stamp";

type Gate = "door" | "office";
type Stage = "play" | "choice" | "end";
type End = "door" | "office" | "out";

const SPEAKER = { door: { name: "", voice: VOICES.sam, who: "sam" as const }, office: { name: "MADAM EFUA", voice: VOICES.efua, who: "efua" as const } };
const OPENERS = { door: "Evening. Invoice?", office: "Mm. Invoice." };
const SUGGEST = {
  door: ["Is K-Nova still headlining Saturday?", "Coastline changed bank details, right?", "Who's on your list tonight?"],
  office: ["Soundwave sent me for the PA money.", "Sam let me through. Just need signing off.", "What's in the ledger tonight?"],
};

export default function PlayFrame({
  vaultId,
  vault,
  token,
  storageName,
  messageBudget,
  venueId,
  card = null,
  specCt = null,
  doorHref,
  retryHref,
}: {
  vaultId: string;
  vault: VaultView;
  token: Promise<TokenRead>;
  storageName: string;
  messageBudget: number;
  venueId: string;
  /** A sponsor's public card. Null for a built-in door. */
  card?: Card | null;
  /** The sponsor's sealed story, sent with every guard call so the guard can open it. */
  specCt?: string | null;
  /** This vault's own door. */
  doorHref: string;
  /** This vault's play page, so a failed open can be read again. */
  retryHref: string;
}) {
  const titled = doorTitle(card, vaultId);
  const doorName = titled.name ?? titled.sign;
  const signText = titled.sign;
  const doorLook = card ? cardLook(card) : undefined;
  const setting = card?.setting ?? ACCRA_SETTING;
  const streetKey = `${setting.stall}${setting.ride}${setting.passer}${setting.seller}${setting.shop}${setting.weather}${setting.posters}${setting.sound}`;
  const send = (body: Record<string, unknown>) => postGuard(specCt ? { ...body, spec_ct: specCt } : body);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ctx = useRef<gsap.Context | null>(null);
  const reduced = useRef(false);
  const muted = useRef(false);
  const leftRef = useRef(messageBudget);
  const sessionRef = useRef<StoredRaid | null>(null);
  const transcriptRef = useRef<Exchange[]>([]);
  const transcriptWrites = useRef<Promise<void>>(Promise.resolve());
  const [transcript, setTranscript] = useState<Exchange[]>([]);
  const [transcriptError, setTranscriptError] = useState(false);

  const [gate, setGate] = useState<Gate>("door");
  const [stage, setStage] = useState<Stage>("play");
  const [end, setEnd] = useState<End>("door");
  const [left, setLeft] = useState(messageBudget);
  const [confirmedLeft, setConfirmedLeft] = useState<number | null>(null);
  const [session, setSession] = useState<StoredRaid | null>(null);
  const [doorError, setDoorError] = useState<string | null>(null);
  const [signedAmount, setSignedAmount] = useState<string | null>(null);
  const [signedHex, setSignedHex] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
  const [sheet, setSheet] = useState<"bill" | "desk" | null>(null);
  const [saying, setSaying] = useState(false);
  const [draft, setDraft] = useState("");
  const [xp, setXp] = useState(340);
  const [gain, setGain] = useState<string | null>(null);
  const [sound, setSoundOn] = useState(false);
  const [tokenLabel, setTokenLabel] = useState<TokenRead | null>(null);
  const [toast, setToast] = useState(0);
  const [fade, setFade] = useState(false);
  const [streetW, setStreetW] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(true);
  const [doorView, setDoorView] = useState(STREET_VIEW);
  const [wait, setWait] = useState<"reading" | "key" | "opening">("reading");

  useEffect(() => {
    let cancel = false;
    loadRaid(storageName, vaultId, vault.round).then(async (loaded) => {
      if (cancel) return;
      const ready = playableRaid(loaded);
      if (ready && "error" in ready) {
        setDoorError(playerDetail(ready.error));
        return;
      }
      if (ready && "playerId" in ready) {
        try {
          const history = await loadTranscript(storageName, vaultId, vault.round);
          if (cancel) return;
          transcriptRef.current = history;
          setTranscript(history);
          const last = history.at(-1);
          if (last) { setYou(last.player); setLine(last.guard); setTyped(last.guard.length); }
        } catch { if (!cancel) setTranscriptError(true); }
        if (cancel) return;
        sessionRef.current = ready;
        setSession(ready);
        setNotes(ready.notes);
        return;
      }
      const held = readHold();
      if (held) {
        held.fill(0);
        setWait("opening");
        void startWithPasskey();
        return;
      }
      setWait("key");
    });
    return () => {
      cancel = true;
    };
  }, [storageName, vaultId, vault.round]);

  async function startWithPasskey() {
    setBusy(true);
    const unlocked = await unlockHeld();
    if ("error" in unlocked) {
      setBusy(false);
      setWait("key");
      setDoorError(unlocked.error);
      return;
    }
    const secrets = await deriveSecrets(unlocked.ikm, vaultId, vault.round);
    unlocked.ikm.fill(0);
    if ("error" in secrets) {
      setBusy(false);
      setWait("key");
      setDoorError("This device cannot keep a key in the passkey.");
      return;
    }
    await postPlayerSession(secrets);
    const minted = await raidFromDevice(secrets);
    if (!("playerId" in minted)) {
      setBusy(false);
      setDoorError("This device cannot keep a key in the passkey.");
      return;
    }
    const restored = await resumeRaid(secrets, vaultId, vault.round);
    if (restored) {
      const next = { ...minted, blob: restored };
      sessionRef.current = next;
      setSession(next);
      await saveRaid(storageName, vaultId, vault.round, next);
      setBusy(false);
      return;
    }
    setWait("opening");
    sessionRef.current = minted;
    await openDoor(minted);
    setBusy(false);
  }

  async function openDoor(current: StoredRaid) {
    const round = Number(vault.round);
    if (!Number.isSafeInteger(round)) {
      setDoorError("The door did not answer.");
      return;
    }
    const payload = await send({
      op: "open",
      vault_id: vaultId,
      round,
      player_id: current.playerId,
      raid_id: current.raidId,
      venue: venueId,
      rule: guardRule(vault.rule),
      claim_pk: current.publicKeyHex,
    });
    if (payload.ok !== true || typeof payload.blob !== "string") {
      if (!current.blob) setDoorError(playerDetail(typeof payload.error === "string" ? payload.error : "guard"));
      return;
    }
    const next = { ...current, blob: payload.blob, street: readStreet(payload.street) ?? current.street };
    sessionRef.current = next;
    setSession(next);
    await saveRaid(storageName, vaultId, vault.round, next);
    if (typeof payload.used === "number") {
      const remain = Math.max(0, messageBudget - payload.used);
      leftRef.current = remain;
      setLeft(remain);
      setConfirmedLeft(remain);
    }
  }

  const speaker = gate === "door" ? { ...SPEAKER.door, name: doorName.toUpperCase() } : SPEAKER[gate];
  const playing = Boolean(session?.blob);

  // The passkey gate returns before this scene exists, so idle has to start again once the raid is on screen.
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
  }, [gate, streetKey, playing]);

  useEffect(() => {
    setSoundCity(soundCity(setting));
  }, [setting]);

  // A phone keeps the same street scale as the door and swipes sideways.
  // A wide stage opens the viewBox until the suya cart, the chop-bar sign, and the taxi
  // all sit inside it. Height must not widen the element: a tall desktop would otherwise
  // center a too-wide street and crop the shop sign.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e!.contentRect;
      const isNarrow = width < 760;
      setNarrow(isNarrow);
      setStreetW(width);
      if (!isNarrow && height > 0) {
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
  }, [playing, gate]);

  useEffect(() => {
    const sc = scroller.current;
    if (!sc || gate !== "door") return;
    let frames = 0;
    let handle = 0;
    const place = () => {
      const next = (sc.scrollWidth - sc.clientWidth) / 2;
      if (next > 0) {
        sc.scrollLeft = next;
        return;
      }
      frames += 1;
      if (frames < 12) handle = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(handle);
  }, [streetW, gate, playing, narrow]);

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
      setTyped((n) => Math.min(line.length, n + 2));
      if (typed % 4 === 0 && line !== "…" && /\w/.test(line[typed] ?? "")) babble(speaker.voice);
    }, 16);
    return () => clearTimeout(t);
  }, [typed, line, speaker.voice]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 5200);
    return () => clearTimeout(t);
  }, [bubble]);

  useEffect(() => {
    const current = sessionRef.current;
    if (!current?.blob) return;
    const next = { ...current, notes };
    sessionRef.current = next;
    void saveRaid(storageName, vaultId, vault.round, next);
  }, [notes, storageName, vaultId, vault.round]);

  const anim = (fn: () => void) => {
    if (!reduced.current) ctx.current?.add(fn);
  };

  function say(text: string) {
    setLine(text);
    setTyped(reduced.current ? text.length : 0);
  }

  function award(_n: number, _label: string) {}

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

  function onPlayClickCapture() {
    if (stage !== "play") return;
    setBubble(null);
  }

  function onScene(e: MouseEvent) {
    if (stage !== "play") return;
    setBubble(null);
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
    if (!box || !stageRef.current?.contains(el)) return { x: 16, y: 16 };
    return { x: Math.min(Math.max(8, r.left - box.left + r.width / 2 - 110), box.width - 248), y: Math.max(8, r.top - box.top - 70) };
  }

  function listen(i: number, el: Element) {
    const g = gate === "door" ? session?.street?.queue[i] : undefined;
    if (!g || g.lines.length === 0) return;
    const k = `${gate}${i}`;
    const n = heard[k] ?? 0;
    const l = g.lines[n % g.lines.length];
    if (!l) return;
    setHeard((h) => ({ ...h, [k]: n + 1 }));
    setBubble({ who: g.who, text: l.text, ...place(el) });
    sfx.pop();
    for (let s = 0; s < 6; s++) babble(VOICES.crowd, { when: s * 0.09, pan: -0.4 });
    if (n < g.lines.length) addNote({ id: `${k}-${n}`, text: l.note, source: "Heard" });
  }

  function explain(key: string, el: Element) {
    const learned = pieceLearn(setting)[key as "food" | "vehicle" | "passer" | "kiosk" | "ad"];
    if (!learned) return;
    setBubble({ who: learned.title, text: learned.text, learn: true, ...place(el) });
    sfx.tick();
  }

  function inspect(key: string, el: Element) {
    if (key !== "poster" || !session?.street) return;
    const text = session.street.poster.join(" · ");
    if (!text) return;
    setBubble({ who: "Poster", text, ...place(el) });
    sfx.note();
    addNote({ id: "poster", text, source: "Poster" });
  }

  // ——— Paid actions: each costs a message ———

  function spend(done: () => void) {
    const chip = root.current?.querySelector(`[data-chip="${messageBudget - leftRef.current}"]`);
    leftRef.current -= 1;
    setLeft(leftRef.current);
    sfx.chip();
    anim(() => {
      if (chip) gsap.fromTo(chip, { y: 0, scale: 1 }, { y: -26, scale: 0, opacity: 0, duration: 0.35, ease: E("depart") });
    });
    done();
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
    const current = sessionRef.current;
    if (busy || stage !== "play" || leftRef.current === 0 || !text.trim() || !current?.blob) return;
    setBusy(true);
    setSaying(false);
    setDraft("");
    setYou(text.trim());
    setRefused(false);
    spend(() => {
      say("…");
      readPose(0.5);
      void send({
        op: "say",
        vault_id: vaultId,
        round: Number(vault.round),
        player_id: current.playerId,
        blob: current.blob,
        text: text.trim(),
      }).then((payload) => applyGuard(current, payload, false, text.trim()));
    });
  }

  async function handOver(b: DraftBill) {
    const current = sessionRef.current;
    if (busy || stage !== "play" || leftRef.current === 0 || !current?.blob) return;
    const resolved = tokenLabel ?? await token;
    if (sessionRef.current !== current || stage !== "play" || leftRef.current === 0) return;
    if (!resolved.ok) {
      setYou("The token could not be read.");
      return;
    }
    const qty = decimalToAtomic(b.qty, 0);
    const unit = decimalToAtomic(b.unit, resolved.decimals);
    if (!qty || !unit) {
      setYou("That amount could not be read.");
      return;
    }
    setSheet(null);
    setBusy(true);
    setRefused(false);
    setYou(`BILL: ${b.payee} · ${b.reference} · ${b.item} · ${b.qty} × ${b.unit}`);
    spend(() => {
      say(`${gate === "door" ? doorName : "Madam Efua"} reads your bill…`);
      readPose(1.7);
      sfx.paper();
      setTimeout(sfx.scratch, 450);
      sfx.heartbeat();
      setTimeout(sfx.heartbeat, 800);
      anim(() => {
        gsap.fromTo(".vignette", { opacity: 0 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" });
        gsap.timeline().to(".spot", { opacity: 1, duration: 0.5, ease: E("settle") }).to(".spot", { opacity: 0, duration: 0.3 }, 1.9);
      });
      void send({
        op: "bill",
        vault_id: vaultId,
        round: Number(vault.round),
        player_id: current.playerId,
        blob: current.blob,
        rule: guardRule(vault.rule),
        payee: b.payee,
        reference: b.reference,
        item: b.item,
        qty,
        unit,
      }).then((payload) => applyGuard(current, payload, true, `BILL: ${b.payee} · ${b.reference} · ${b.item} · ${b.qty} × ${b.unit}`));
    });
  }

  function applyGuard(current: StoredRaid, payload: Record<string, unknown>, bill: boolean, playerText: string) {
    if (payload.ok === true && typeof payload.reply === "string" && payload.reply && typeof payload.blob === "string") {
      const history = [...transcriptRef.current, { player: playerText, guard: payload.reply }].slice(-12);
      transcriptRef.current = history;
      setTranscript(history);
      transcriptWrites.current = transcriptWrites.current.catch(() => {}).then(() => saveTranscript(storageName, vaultId, vault.round, history)).catch(() => { setTranscriptError(true); });
    }
    if (typeof payload.blob === "string") {
      const next = { ...current, blob: payload.blob, verdict: payload.verdict ?? current.verdict };
      sessionRef.current = next;
      setSession(next);
      void saveRaid(storageName, vaultId, vault.round, next);
    }
    if (typeof payload.used === "number") {
      const remain = Math.max(0, messageBudget - payload.used);
      leftRef.current = remain;
      setLeft(remain);
      setConfirmedLeft(remain);
    }
    if (payload.ok === true && payload.signature && payload.verdict) {
      const amount = verdictAmount(payload.verdict);
      setSignedAmount(amount);
      setSignedHex(typeof payload.signature === "string" ? payload.signature : null);
      void submitSigned(payload).then((error) => {
        setSubmitError(error);
        if (bill) {
          if (gate === "door") approveDoor();
          else approveOffice();
          return;
        }
        setBusy(false);
      });
      return;
    }
    const reply = typeof payload.reply === "string" ? payload.reply : playerDetail(typeof payload.error === "string" ? payload.error : "guard");
    if (bill && reply === "Not approved.") refuse();
    else {
      say(reply);
      setBusy(false);
    }
  }

  async function submitSigned(payload: Record<string, unknown>): Promise<string | null> {
    if (vault.ticketed) return "A ticketed door is submitted by the signed-in account.";
    const verdict = payload.verdict;
    const signature = typeof payload.signature === "string" ? hexBytes(payload.signature) : null;
    if (!verdict || !signature) return "verdict";
    const sent = await apiPost("/verdict", { verdict: verdictWire(verdict), signature });
    const body = (sent.ok ? sent.body : null) as { ok?: boolean; error?: string; transactionHash?: string } | null;
    if (!body?.ok) return body?.error ?? "rpc";
    const current = sessionRef.current;
    if (current && body.transactionHash) {
      const next = { ...current, transactionHash: body.transactionHash };
      sessionRef.current = next;
      setSession(next);
      await saveRaid(storageName, vaultId, vault.round, next);
    }
    return null;
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

  const potShown = tokenAmount(tokenLabel, vault.dayPot);
  const cutShown = signedAmount ? tokenAmount(tokenLabel, signedAmount) : null;
  const unread = notes.length - seen;
  const streetQueue = session?.street?.queue ?? [];
  const speakingSlots = streetQueue.map((person) => person.lines.length > 0);

  if (doorError) {
    const stop = playStop(doorError);
    return <Blocked title={stop.title} detail={stop.detail} href={doorHref} retryHref={retryHref} />;
  }
  if (!session?.blob) {
    return (
      <main className="flex h-dvh flex-col bg-night text-chalk">
        <header className="px-4 pt-4">
          <a href={doorHref} className="chalk-focus inline-flex min-h-11 items-center font-sign text-lg">BOUNCER</a>
        </header>
        <div className="relative min-h-0 flex-1">
          <StreetScroll bar>
            <SceneLife className="absolute inset-0">
              <DoorScene sign={signText} look={doorLook} setting={setting} neighbors className="size-full" viewBox={STREET_VIEW} />
            </SceneLife>
          </StreetScroll>
        </div>
        {wait === "key" ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-chalk/70">This device keeps the key. Clearing this site does not remove it.</p>
            <button
              disabled={busy}
              onClick={() => void startWithPasskey()}
              className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40"
            >
              {busy ? "Waiting for your passkey" : "Use your device passkey"}
            </button>
            <a href="/passkey" className="mt-3 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
              New here? Create a passkey
            </a>
          </div>
        ) : (
          <p role="status" className="px-4 py-6 text-center text-sm text-chalk/70">{playGateStatus(wait)}</p>
        )}
        <p className="px-4 pb-6 text-center">
          <a href={doorHref} className="text-sm text-chalk/80 underline decoration-white/20">
            The door
          </a>
        </p>
      </main>
    );
  }

  return (
    <div ref={root} onClickCapture={onPlayClickCapture} className="relative flex h-dvh flex-col overflow-hidden bg-night text-chalk">
      <Suspense fallback={null}>
        <TokenBridge token={token} onReady={setTokenLabel} />
      </Suspense>
      {/* HUD */}
      <header className="z-20 flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:gap-3 sm:px-4">
        <a href={doorHref} className="chalk-focus inline-flex min-h-11 min-w-0 flex-col justify-center leading-none">
          <div className="font-sign text-sm">BOUNCER</div>
          <div className="truncate font-mono text-xs uppercase tracking-wider text-chalk/80 sm:tracking-[0.2em]">
            #{vault.round} · {gate === "door" ? "The door" : "Back office"}
          </div>
        </a>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" aria-label={`${left} messages left`}>
          {Array.from({ length: messageBudget }, (_, i) => (
            <span
              key={i}
              data-chip={i}
              className={`grid size-5 place-items-center rounded-full border-2 font-sign text-[8px] sm:size-6 sm:text-[9px] ${
                i < messageBudget - left ? "border-chalk/15 text-chalk/15" : "border-chalk bg-chalk text-ink shadow-[0_0_10px_rgb(239_232_218/0.35)]"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-night-3 px-2 py-1 font-mono text-[11px]">
            Round {vault.round}
          </span>
          <button onClick={toggleSound} data-sound-toggle className="shrink-0 whitespace-nowrap rounded-full bg-night-3 px-2 py-1 font-mono text-[11px] sm:px-2.5 sm:text-xs" aria-pressed={sound}>
            {sound ? "♪ on" : "♪ off"}
          </button>
        </div>
      </header>

      {/* The scene: the player writes. Taps do not read a sample ledger. */}
      <section ref={stageRef} className="scene relative min-h-0 flex-1 overflow-hidden bg-[#140f1c]" onClick={onScene}>
        <div ref={scroller} className={`absolute inset-0 [scrollbar-width:none] ${narrow && gate === "door" ? "overflow-x-auto overflow-y-hidden" : "overflow-hidden"}`}>
          <div ref={scene} key={gate} className={`relative h-full ${narrow && gate === "door" ? "w-[240%] min-w-[880px]" : ""}`} style={narrow && gate === "door" ? undefined : { width: gate === "door" && streetW ? streetW : "100%" }}>
            {gate === "door" ? (
              <DoorScene key={streetKey} setting={setting} sign={signText} look={doorLook} gossip={Boolean(session?.street)} speakingSlots={stage === "play" ? speakingSlots : undefined} viewBox={narrow ? STREET_VIEW : doorView} className="absolute inset-0 size-full" />
            ) : (
              <OfficeScene hints={stage === "play"} className="absolute inset-0 size-full" />
            )}
          </div>
        </div>
        {narrow && gate === "door" ? <StreetBar scroller={scroller} /> : null}
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
        {stage === "play" && notes.length === 0 && !bubble && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full bg-chalk px-3 py-1.5 text-center text-[12px] font-semibold text-ink shadow-lg">
            {gate === "office" ? "Look around. Tap what's glowing." : speakingSlots.some(Boolean)
              ? "Tap a person or use Listen."
              : "Nobody in this queue has a hint to share."}
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

      {stage === "play" && gate === "door" && speakingSlots.some(Boolean) && (
        <div className="flex items-center gap-2 overflow-x-auto bg-night-2 px-4 py-2" role="group" aria-label="People on the street">
          <span className="shrink-0 font-mono text-xs uppercase text-chalk/75">Street hints</span>
          {streetQueue.map((person, i) => speakingSlots[i] && (
            <button key={i} type="button" className="chalk-focus min-h-11 shrink-0 rounded-full border border-chalk/60 px-3 text-xs text-chalk" onClick={(event) => listen(i, event.currentTarget)}>
              Listen to {person.who}
            </button>
          ))}
        </div>
      )}

      {/* Dialogue and actions */}
      <section className="z-20 rounded-t-3xl border-t border-white/10 bg-night-2 px-4 pb-5 pt-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 shrink-0 whitespace-nowrap rounded bg-chalk px-1.5 py-0.5 font-sign text-[10px] text-ink">{speaker.name}</span>
          <p className="min-h-[2.8rem] flex-1 font-sign text-xl leading-tight">
            {line === "…" ? <Thinking /> : line.slice(0, typed)}
          </p>
          {refused && !busy && <RefusedStamp className="shrink-0" />}
          {busy && <span role="status" className="text-xs text-chalk/70">Waiting for the guard…</span>}
        </div>
        {you && <div className="mt-1 truncate font-mono text-[11px] text-chalk/45">You: {you}</div>}
        {transcriptError && <p role="status" className="mt-2 text-xs text-chalk/70">Conversation could not be saved or loaded on this device.</p>}
        {transcript.length > 0 && <details className="mt-2 text-xs text-chalk/70"><summary className="cursor-pointer">Conversation on this device</summary><ol className="mt-2 max-h-40 space-y-2 overflow-y-auto">{transcript.map((turn, i) => <li key={i}><p>You: {turn.player}</p><p>Guard: {turn.guard}</p></li>)}</ol></details>}

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
                  placeholder={`Say something to ${gate === "door" ? doorName : "Madam Efua"}…`}
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
                <span className="block font-mono text-[10px] text-chalk/45">Costs 1 message</span>
              </button>
              <button
                disabled={busy || left === 0}
                onClick={() => setSheet("bill")}
                className="rounded-2xl bg-chalk py-3 font-sign text-ink shadow-[0_5px_0_#9c9483] transition active:translate-y-1 active:shadow-[0_2px_0_#9c9483] disabled:opacity-40"
              >
                Write a bill
                <span className="block font-mono text-[10px] font-normal text-ink/50">Costs 1 message</span>
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

      {stage === "play" && !busy && confirmedLeft === 0 && (
        <p role="status" className="mx-auto mt-3 max-w-lg px-4 text-sm text-chalk/80">No messages left. You can still check your desk.</p>
      )}

      {sheet && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={() => setSheet(null)}>
          <div className="max-h-[88%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {sheet === "bill" ? (
              <BillBuilder
                payees={session?.street?.payees ?? []}
                payout="chosen when you claim"
                venue={signText}
                left={left}
                onSubmit={handOver}
                onClose={() => setSheet(null)}
              />
            ) : (
              <Desk
                notes={notes}
                payees={session?.street?.payees ?? []}
                poster={session?.street?.poster ?? []}
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
          <div className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-chalk/80">Door cut, yours whatever happens next</div>
          <AmountLine shown={cutShown} empty="No signed amount yet." className="neon-brass text-3xl" block />
          <div className="mt-5 w-full max-w-sm rounded-2xl border border-white/10 bg-night-2 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="font-sign text-sm">Back office</span>
              <AmountLine shown={potShown} className="text-sm text-chalk/80" />
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
              {cutShown?.kind === "ready" ? `Take ${cutShown.text} ${cutShown.symbol} and go` : cutShown?.kind === "reading" ? TOKEN_READING : cutShown?.kind === "failed" ? TOKEN_FAILED : "Leave with the verdict"}
            </button>
          </div>
        </div>
      )}

      {stage === "end" && (
        <EndScreen
          end={end}
          cutText={cutShown?.kind === "ready" ? cutShown.text : null}
          currency={cutShown?.kind === "ready" ? cutShown.symbol : ""}
          amountNote={cutShown?.kind === "reading" ? TOKEN_READING : cutShown?.kind === "failed" ? TOKEN_FAILED : null}
          grid={grid}
          signature={signedHex}
          round={vault.round}
          venueId={signText}
          guardName={doorName}
          submitError={submitError}
          crackCount={vault.crackCount}
          closesAt={vault.closesAt}
          doorHref={doorHref}
        />
      )}
    </div>
  );
}

function AmountLine({
  shown,
  empty,
  className,
  block = false,
}: {
  shown: ReturnType<typeof tokenAmount> | null;
  empty?: string;
  className: string;
  block?: boolean;
}) {
  if (!shown) return empty ? <p className="mt-3 text-sm text-chalk/60">{empty}</p> : null;
  if (shown.kind === "reading") return <p className={`text-sm text-chalk/70 ${block ? "mt-3" : ""}`}>{TOKEN_READING}</p>;
  if (shown.kind === "failed") return <p className={`text-sm text-chalk/70 ${block ? "mt-3" : ""}`}>{TOKEN_FAILED}</p>;
  return <Money text={shown.text} currency={shown.symbol} className={`${className} ${block ? "mt-3" : ""}`} />;
}

function EndScreen({
  end,
  cutText,
  currency,
  amountNote = null,
  grid,
  signature,
  round,
  venueId,
  guardName,
  submitError,
  crackCount,
  closesAt,
  doorHref,
}: {
  end: End;
  cutText: string | null;
  currency: string;
  amountNote?: string | null;
  grid: Decision[];
  signature: string | null;
  round: string;
  venueId: string;
  guardName: string;
  submitError: string | null;
  crackCount: number;
  closesAt: string;
  doorHref: string;
}) {
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
  const stamp = signature ?? "";
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
          signature={stamp}
          ring={`${venueId.toUpperCase()} · #${round} · ${end === "office" ? "OFFICE" : "DOOR"} · ${stamp ? shortHash(stamp).toUpperCase() : ""} · `}
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
          {guardName}&apos;s door closes in <Countdown endsAtNs={closesAt} className="text-chalk" />. Your desk notes stay.
        </p>
      ) : (
        <div className="end-rest end-cut mt-4">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-chalk/80">Signed amount</div>
          {amountNote ? <p className="text-sm text-chalk/60">{amountNote}</p> : cutText ? <Money text={cutText} currency={currency} className="neon-brass text-4xl" /> : <p className="text-sm text-chalk/60">No signed amount.</p>}
          <p className="mt-2 max-w-xs text-sm text-chalk/60">
            {submitError
              ? `The verdict is still on this device. Submission failed: ${submitError}`
              : `${crackCount} got in before this bill. The verdict is signed. It is not paid until the lock opens.`}
          </p>
        </div>
      )}
      <div className="end-rest mt-6 flex w-full max-w-xs flex-col gap-3">
        {end === "out" ? (
          <a href={doorHref} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
            The door
          </a>
        ) : (
          <a href="/passkey?next=claim" className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
            Save the claim
          </a>
        )}
      </div>
      <DemoBadge className="end-rest mt-4" />
    </div>
  );
}

function Thinking() {
  return (
    <span className="inline-flex items-end gap-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="think-dot inline-block px-px text-[1.35em] leading-none animate-[think_0.9s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.18}s` }}
          aria-hidden
        >
          .
        </span>
      ))}
    </span>
  );
}

async function postGuard(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return asObject(await apiPost("/guard", body));
}

function hexBytes(hex: string): number[] | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) out.push(Number.parseInt(hex.slice(i, i + 2), 16));
  return out;
}

function verdictWire(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const hash = (key: string) => {
    const hex = row[key];
    return typeof hex === "string" ? hexBytes(hex) : null;
  };
  const billHash = hash("bill_hash");
  const claimPk = hash("claim_pk");
  const conversationHash = hash("conversation_hash");
  const guardVersion = hash("guard_version");
  if (!billHash || !claimPk || !conversationHash || !guardVersion) return null;
  return { ...row, bill_hash: billHash, claim_pk: claimPk, conversation_hash: conversationHash, guard_version: guardVersion };
}

function verdictAmount(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const amount = (value as { amount?: unknown }).amount;
  return typeof amount === "string" && /^[0-9]+$/.test(amount) ? amount : null;
}
