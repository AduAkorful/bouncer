"use client";

import { cardLook, type Card } from "@/lib/card";
import { apiPost, asObject } from "@/lib/api";
import { sponsorsThisDoor } from "@/lib/own-account";
import type { ListedDoor } from "@/lib/door-index";
import { lastWord, winWord } from "@/lib/last-word";
import { shareText, winningMessage } from "@/lib/share-text";
import { writeLastShare } from "@/lib/last-share";
import { ShareButton } from "@/components/ShareButton";
import { loadPlayerSession } from "@/lib/player-session";
import { TokenAmount } from "@/components/TokenAmount";

import gsap from "gsap";
import { Suspense, use, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Countdown, useReached } from "@/components/Countdown";
import { DemoBadge, Money } from "@/components/bits";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { StreetBar } from "@/components/home/StreetBar";
import { StreetScroll } from "@/components/home/StreetScroll";
import { BillBuilder, forgetBillDraft } from "@/components/play/BillBuilder";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { Desk, type Note } from "@/components/play/Desk";
import { HelpButton } from "@/components/help/HelpButton";
import { Tip } from "@/components/help/Tip";
import { tipText, type TipId } from "@/lib/help";
import { markTip, skipTips, tipSeen } from "@/lib/tips";
import { ApprovedStamp, RefusedStamp, TurnedAwayStamp } from "@/components/Stamp";
import { TokenBridge } from "@/components/TokenAmount";
import type { DraftBill } from "@/lib/bill";

type Decision = "ask" | "refused" | "approved" | "none";
import { Blocked } from "@/components/Blocked";
import { doorPaths } from "@/lib/door-read";
import { heldRefusal, heldVerdict, submitHeld, verdictAmount } from "@/lib/held-verdict";
import { mergeProof } from "@/lib/proof-bundle";
import { doorTitle, playableRaid, playerDetail, playGateStatus, playStop, SPONSOR_DETAIL } from "@/lib/door";
import { resumeRaid, postPlayerSession, playerHeader } from "@/lib/player-session";
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
import { readSoundPref, writeSoundPref } from "@/lib/sound-pref";
import { shortHash } from "@/lib/stamp";

type Stage = "play" | "held" | "choice" | "end";
/** Where a recorded verdict goes next: the door's celebration, or straight to the end screen after a reload. */
type After = "door" | "end";
type End = "door" | "out";

const OPENER = "Evening. Invoice?";
const SUGGEST = ["Is K-Nova still headlining Saturday?", "Coastline changed bank details, right?", "Who's on your list tonight?"];
/** A sponsor's door has its own story, so it is not offered The Velvet's lines about K-Nova and Coastline. */
const SUGGEST_ANY_DOOR = ["Who's on your list tonight?", "Is anyone still owed from last week?", "Do you take invoices at the door?"];

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
  others,
}: {
  /** Tonight's other open doors, for the ending. */
  others?: Promise<ListedDoor[]>;
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

  /**
   * The guard advances the sealed blob before its reply arrives. The call is stored first, so a reload can send
   * the same blob and input again, and the guard answers that repeat from its stored reply.
   */
  async function guardCall(current: StoredRaid, body: Record<string, unknown>, bill: boolean, playerText: string) {
    const waiting = { ...current, pending: { body, bill, playerText } };
    sessionRef.current = waiting;
    await saveRaid(storageName, vaultId, vault.round, waiting).catch(() => undefined);
    const { payload, answered } = await send(body);
    if (!answered) {
      // The call stays stored. The next load sends it again.
      setNotice("The guard did not answer. Your message is kept and will be sent again.");
      setBusy(false);
      return;
    }
    applyGuard({ ...waiting, pending: null }, payload, bill, playerText);
  }
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ctx = useRef<gsap.Context | null>(null);
  const reduced = useRef(false);
  const muted = useRef(false);
  const leftRef = useRef(messageBudget);
  const sessionRef = useRef<StoredRaid | null>(null);
  /** A stored raid waiting for its passkey after a log out. */
  const parked = useRef<StoredRaid | null>(null);
  const transcriptRef = useRef<Exchange[]>([]);
  const transcriptWrites = useRef<Promise<void>>(Promise.resolve());
  const [transcript, setTranscript] = useState<Exchange[]>([]);
  const [transcriptError, setTranscriptError] = useState(false);

  const [stage, setStage] = useState<Stage>("play");
  const [end, setEnd] = useState<End>("door");
  const [left, setLeft] = useState(messageBudget);
  const [confirmedLeft, setConfirmedLeft] = useState<number | null>(null);
  /** A line from the page, not from the guard: errors and recovery. */
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<StoredRaid | null>(null);
  const [doorError, setDoorError] = useState<string | null>(null);
  const [signedAmount, setSignedAmount] = useState<string | null>(null);
  const [signedHex, setSignedHex] = useState<string | null>(null);
  const [holding, setHolding] = useState<{ sending: boolean; message: string | null; retry: boolean; after: After } | null>(null);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(OPENER);
  const [typed, setTyped] = useState(OPENER.length);
  const [you, setYou] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [grid, setGrid] = useState<Decision[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [seen, setSeen] = useState(0);
  const [heard, setHeard] = useState<Record<string, number>>({});
  const [bubble, setBubble] = useState<{ who: string; text: string; x: number; y: number; learn?: boolean; gloss?: string } | null>(null);
  const [sheet, setSheetState] = useState<"bill" | "desk" | null>(null);
  const billDraftKey = `${storageName}:bill:${vaultId}:${vault.round}`;
  // An open sheet is one history entry, so the phone's Back closes it instead of leaving the raid.
  const setSheet = useCallback((next: "bill" | "desk" | null) => {
    const marked = Boolean((window.history.state as { bouncerSheet?: boolean } | null)?.bouncerSheet);
    if (next && !marked) window.history.pushState({ ...(window.history.state ?? {}), bouncerSheet: true }, "");
    if (!next && marked) {
      window.history.back();
      return;
    }
    setSheetState(next);
  }, []);
  const closeSheet = useCallback(() => setSheet(null), [setSheet]);
  const sheetPanel = useRef<HTMLDivElement>(null);
  useDialogFocus(sheetPanel, sheet !== null, closeSheet);
  useEffect(() => {
    // A reload keeps the marked entry with no sheet open. Unmark it so the next close does not go back a page.
    const state = window.history.state as { bouncerSheet?: boolean } | null;
    if (state?.bouncerSheet) window.history.replaceState({ ...state, bouncerSheet: false }, "");
    const onPop = () => setSheetState(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [saying, setSaying] = useState(false);
  // First-raid tips (plan 80): one at a time, read from this browser after mount, never over an input or a stamp.
  const [tip, setTip] = useState<TipId | null>(null);
  const [tipTick, setTipTick] = useState(0);
  const [streetWaited, setStreetWaited] = useState(false);
  const [draft, setDraft] = useState("");
  const [sound, setSoundOn] = useState(false);
  const [tokenLabel, setTokenLabel] = useState<TokenRead | null>(null);
  const tokenSymbol = tokenLabel?.ok ? tokenLabel.symbol : "";
  useEffect(() => {
    const waited = window.setTimeout(() => setStreetWaited(true), 10_000);
    return () => window.clearTimeout(waited);
  }, []);
  useEffect(() => {
    if (stage !== "play" || busy) {
      setTip(null);
      return;
    }
    if (sheet === "bill") {
      setTip(tipSeen("bill") ? null : "bill");
      return;
    }
    if (sheet || saying) {
      setTip(null);
      return;
    }
    if (!tipSeen("desk") && (notes.length > 0 || streetWaited)) setTip("desk");
    else if (tipSeen("desk") && !tipSeen("messages")) setTip("messages");
    else setTip(null);
  }, [stage, busy, sheet, saying, notes.length, streetWaited, tipTick]);
  const doneTip = useCallback((id: TipId, all: boolean) => {
    if (all) skipTips();
    else markTip(id);
    setTipTick((n) => n + 1);
  }, []);
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
        // A raid on this browser is not reopened for whoever is here: after a log out, the passkey has to match it.
        const signedIn = await readHold();
        if (!signedIn) {
          parked.current = ready;
          setWait("key");
          return;
        }
        signedIn.fill(0);
        await adoptStored(ready, () => cancel);
        return;
      }
      const held = await readHold();
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

  // When the last message has been answered and read, the raid ends. This does not depend on the reply's own timer,
  // so a sixth message that was chat still ends the raid without a reload.
  useEffect(() => {
    if (confirmedLeft !== 0 || busy || stage !== "play" || !session || session.pending || session.signature || heldVerdict(session)) return;
    const timer = setTimeout(() => {
      setEnd("out");
      setStage("end");
    }, 2500);
    return () => clearTimeout(timer);
  }, [confirmedLeft, busy, stage, session]);

  async function adoptStored(ready: StoredRaid, cancelled: () => boolean = () => false) {
    try {
      const history = await loadTranscript(storageName, vaultId, vault.round);
      if (cancelled()) return;
      transcriptRef.current = history;
      setTranscript(history);
      const last = history.at(-1);
      if (last) { setYou(last.player); setLine(last.guard); setTyped(last.guard.length); }
    } catch { if (!cancelled()) setTranscriptError(true); }
    if (cancelled()) return;
    sessionRef.current = ready;
    setSession(ready);
    setNotes(ready.notes);
    // A raid stored before the count was kept falls back to the conversation on this device: one turn per message or bill.
    if (typeof ready.used === "number") countFrom(ready.used);
    else if (transcriptRef.current.length > 0) countFrom(transcriptRef.current.length);
    // The squares come back as they were. A raid stored before they were kept falls back to one per message.
    const spent = typeof ready.used === "number" ? ready.used : transcriptRef.current.length;
    const won = Boolean(ready.verdict) && (ready.recorded === true || Boolean(ready.transactionHash));
    const squares: Decision[] = ready.outcomes && ready.outcomes.length > 0
      ? ready.outcomes
      : Array.from({ length: Math.min(messageBudget, spent) }, (_, i) => (won && i === spent - 1 ? "approved" : "ask"));
    setGrid(squares);
    if (ready.pending) {
      const pending = ready.pending;
      setYou(pending.playerText);
      setNotice("Getting the guard's last reply…");
      setBusy(true);
      void guardCall(ready, pending.body, pending.bill, pending.playerText);
      return;
    }
    const held = heldVerdict(ready);
    // A raid the vault recorded as a win reopens on the Got-in ending, the same one seen when the win happened.
    if (!held && won) {
      setSignedAmount(verdictAmount(ready.verdict as Record<string, unknown>));
      setEnd("door");
      setStage("end");
      return;
    }
    // A raid that already used every message reopens on its ending, not on a dead desk.
    if (!held && leftRef.current === 0) {
      setEnd("out");
      setStage("end");
      return;
    }
    if (held) {
      setSignedAmount(verdictAmount(held.verdict));
      setSignedHex(held.signature);
      // A verdict the vault already refused is shown with its reason, not sent again on every load.
      const refusal = heldRefusal(ready);
      if (refusal) {
        setStage("held");
        setHolding({ sending: false, message: refusal, retry: false, after: "end" });
      } else {
        void recordHeld("end");
      }
    }
  }

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
    const stored = parked.current;
    if (stored) {
      setBusy(false);
      if (secrets.raidId !== stored.raidId) {
        // The stored raid may hold someone's unrecorded win. It is not overwritten.
        setWait("key");
        setDoorError("This browser holds another player's raid for tonight. Use that player's passkey to continue it.");
        return;
      }
      parked.current = null;
      await adoptStored(stored);
      return;
    }
    // A sponsor's own win can never be paid, and it would take the night's slot from everyone else.
    if (await sponsorsThisDoor(secrets.accountPublicKey, storageName, vault.sponsor)) {
      setBusy(false);
      setWait("key");
      setDoorError(SPONSOR_DETAIL);
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
      // Another browser left this raid: the count, the squares, the street hints and a recorded win come with it.
      const { progress } = restored;
      const next: StoredRaid = {
        ...minted,
        blob: restored.blob,
        used: progress.used,
        outcomes: progress.outcomes,
        street: readStreet(progress.street),
        ...(progress.won ? { verdict: { amount: progress.amount }, recorded: true } : {}),
      };
      await saveRaid(storageName, vaultId, vault.round, next);
      setBusy(false);
      await adoptStored(next);
      return;
    }
    setWait("opening");
    sessionRef.current = minted;
    await openDoor(minted, playerHeader(secrets, "/guard/open"));
    setBusy(false);
  }

  /** `auth` proves the passkey's account and claim key to the server, which refuses the door's sponsor. */
  async function openDoor(current: StoredRaid, auth: string) {
    const round = Number(vault.round);
    if (!Number.isSafeInteger(round)) {
      setDoorError("The door did not answer.");
      return;
    }
    const { payload } = await postGuard({
      ...(specCt ? { spec_ct: specCt } : {}),
      op: "open",
      vault_id: vaultId,
      round,
      player_id: current.playerId,
      raid_id: current.raidId,
      venue: venueId,
      rule: guardRule(vault.rule),
      claim_pk: current.publicKeyHex,
    }, auth);
    if (payload.ok !== true || typeof payload.blob !== "string") {
      if (!current.blob) setDoorError(playerDetail(typeof payload.error === "string" ? payload.error : "guard"));
      return;
    }
    const next = { ...current, blob: payload.blob, street: readStreet(payload.street) ?? current.street, ...(typeof payload.used === "number" ? { used: payload.used } : {}), proof: mergeProof(current.proof, payload) };
    sessionRef.current = next;
    setSession(next);
    await saveRaid(storageName, vaultId, vault.round, next);
    if (typeof payload.used === "number") countFrom(payload.used);
  }

  const speaker = { name: doorName.toUpperCase(), voice: VOICES.sam };
  const playing = Boolean(session?.blob);

  // The passkey gate returns before this scene exists, so idle has to start again once the raid is on screen.
  useLayoutEffect(() => {
    registerMotion();
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ctx.current = gsap.context(() => {
      if (!reduced.current && scene.current) startIdle(scene.current);
    }, root);
    const off = reduced.current || !root.current ? () => {} : beatGlow(root.current, "[data-part=door-glow], #club-light");
    const offP = reduced.current || !stageRef.current ? () => {} : parallax(stageRef.current);
    return () => {
      off();
      offP();
      ctx.current?.revert();
    };
  }, [streetKey, playing]);

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
  }, [playing]);

  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
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
  }, [streetW, playing, narrow]);

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

  // Sound starts on the first tap anywhere, unless the player has muted it here or in settings.
  useEffect(() => {
    if (readSoundPref() === "off") muted.current = true;
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
    const g = session?.street?.queue[i];
    if (!g || g.lines.length === 0) return;
    const k = `door${i}`;
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
      rigTo(s, "read", 0.35, E("settle"));
      const swings = Math.max(1, Math.floor(dur / 0.16)) | 1;
      rigTween(s, { ru: "+=5", rv: "+=2", duration: 0.16, yoyo: true, repeat: swings, ease: "sine.inOut", delay: 0.4 });
      gsap.delayedCall(dur, () => rigTo(s, "idle", 0.35, E("settle")));
    });
  }

  /** An unanswered call goes first. A new message on the same blob would be refused as a replay. */
  function resendPending(newBill = false): boolean {
    const current = sessionRef.current;
    if (!current?.pending) return false;
    setBusy(true);
    setSheet(null);
    setYou(current.pending.playerText);
    // The new bill is not lost silently: it stays in the sheet's draft, and the player is told why it did not go.
    setNotice(newBill ? "Sending your last message again first. Your bill is kept. Write it again when this has gone." : "Sending your last message again…");
    void guardCall(current, current.pending.body, current.pending.bill, current.pending.playerText);
    return true;
  }

  function talk(text: string) {
    const current = sessionRef.current;
    if (busy || stage !== "play" || leftRef.current === 0 || !text.trim() || !current?.blob) return;
    if (resendPending()) return;
    setBusy(true);
    setNotice(null);
    setSaying(false);
    setDraft("");
    setYou(text.trim());
    setRefused(false);
    spend(() => {
      say("…");
      readPose(0.5);
      void guardCall(current, {
        op: "say",
        vault_id: vaultId,
        round: Number(vault.round),
        player_id: current.playerId,
        blob: current.blob,
        text: text.trim(),
      }, false, text.trim());
    });
  }

  async function handOver(b: DraftBill) {
    const current = sessionRef.current;
    if (busy || stage !== "play" || leftRef.current === 0 || !current?.blob) return;
    if (resendPending(true)) return;
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
    forgetBillDraft(billDraftKey);
    setBusy(true);
    setNotice(null);
    setRefused(false);
    setYou(billEcho(b, tokenSymbol));
    spend(() => {
      say(`${doorName} reads your bill…`);
      readPose(1.7);
      sfx.paper();
      setTimeout(sfx.scratch, 450);
      sfx.heartbeat();
      setTimeout(sfx.heartbeat, 800);
      anim(() => {
        gsap.fromTo(".vignette", { opacity: 0 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" });
        gsap.timeline().to(".spot", { opacity: 1, duration: 0.5, ease: E("settle") }).to(".spot", { opacity: 0, duration: 0.3 }, 1.9);
      });
      void guardCall(current, {
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
      }, true, billEcho(b, tokenSymbol));
    });
  }

  function countFrom(used: number) {
    const remain = Math.max(0, messageBudget - used);
    leftRef.current = remain;
    setLeft(remain);
    setConfirmedLeft(remain);
  }

  function applyGuard(answered: StoredRaid, payload: Record<string, unknown>, bill: boolean, playerText: string) {
    setNotice(null);
    // The guard's count is saved with the raid, so a reload shows the messages that are really left.
    let current = typeof payload.used === "number" ? { ...answered, used: payload.used } : answered;
    if (payload.ok === true && typeof payload.reply === "string" && payload.reply && typeof payload.blob === "string") {
      // One square per counted message, kept with the raid so a reload ends on the same count.
      const entry: Decision = !bill ? "ask" : payload.signature && payload.verdict ? "approved" : "refused";
      current = { ...current, outcomes: [...(answered.outcomes ?? []), entry] };
      setGrid((g) => [...g, entry]);
      const history = [...transcriptRef.current, { player: playerText, guard: payload.reply }].slice(-12);
      transcriptRef.current = history;
      setTranscript(history);
      transcriptWrites.current = transcriptWrites.current.catch(() => {}).then(() => saveTranscript(storageName, vaultId, vault.round, history)).catch(() => { setTranscriptError(true); });
    }
    if (typeof payload.blob !== "string" && current.pending === null) {
      sessionRef.current = current;
      void saveRaid(storageName, vaultId, vault.round, current).catch(() => undefined);
    }
    if (typeof payload.blob === "string") {
      const signed = payload.ok === true && typeof payload.signature === "string" && payload.verdict;
      const proof = mergeProof(current.proof, payload);
      const next = signed
        ? { ...current, blob: payload.blob, verdict: payload.verdict, signature: payload.signature as string, transactionHash: null, recorded: false, proof }
        : { ...current, blob: payload.blob, verdict: payload.verdict ?? current.verdict, proof };
      sessionRef.current = next;
      setSession(next);
      void saveRaid(storageName, vaultId, vault.round, next);
    }
    if (typeof payload.used === "number") countFrom(payload.used);
    if (payload.ok !== true && typeof payload.reply !== "string") {
      // An error is the page's line, not the guard's. A message the guard did not count is given back.
      const error = typeof payload.error === "string" ? payload.error : "guard";
      if (error === "spent") countFrom(messageBudget);
      else if (typeof payload.used !== "number") {
        leftRef.current = Math.min(messageBudget, leftRef.current + 1);
        setLeft(leftRef.current);
      }
      say(transcriptRef.current.at(-1)?.guard ?? OPENER);
      sfx.error();
      setNotice(guardNotice(error));
      setBusy(false);
      return;
    }
    if (payload.ok === true && payload.signature && payload.verdict) {
      const amount = verdictAmount(payload.verdict);
      setSignedAmount(amount);
      setSignedHex(typeof payload.signature === "string" ? payload.signature : null);
      // The signed verdict is the answer. The model's own words can read like a refusal, so they are not shown here.
      say("Approved.");
      void recordHeld("door");
      return;
    }
    const reply = typeof payload.reply === "string" ? payload.reply : OPENER;
    if (bill && reply === "Not approved.") refuse();
    else {
      say(reply);
      setBusy(false);
      // The last message was talk, not a bill: the raid ends the same way, once the reply has been read.
      if (leftRef.current === 0) {
        setTimeout(() => {
          sfx.turnedAway();
          setEnd("out");
          setStage("end");
        }, Math.min(6000, 1800 + reply.length * 35));
      }
    }
  }

  /** The win is celebrated only after the vault has recorded the verdict. Until then it is held on this device. */
  async function recordHeld(after: After) {
    const held = heldVerdict(sessionRef.current);
    const current = sessionRef.current;
    if (!held || !current) return;
    setBusy(true);
    setStage("held");
    setHolding({ sending: true, message: null, retry: false, after });
    if (vault.ticketed) {
      setHolding({ sending: false, message: "A ticketed door is submitted by the signed-in account.", retry: false, after });
      setBusy(false);
      return;
    }
    let outcome = await submitHeld(held, current.raidId, vaultId, apiPost);
    for (let attempt = 0; !outcome.ok && outcome.retry && attempt < 2; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      outcome = await submitHeld(held, current.raidId, vaultId, apiPost);
    }
    if (!outcome.ok) {
      if (outcome.refused) {
        const next = { ...(sessionRef.current ?? current), refused: outcome.message };
        sessionRef.current = next;
        setSession(next);
        await saveRaid(storageName, vaultId, vault.round, next).catch(() => undefined);
      }
      setHolding({ sending: false, message: outcome.message, retry: outcome.retry, after });
      setBusy(false);
      return;
    }
    const next = { ...(sessionRef.current ?? current), transactionHash: outcome.transactionHash, recorded: true, refused: null };
    sessionRef.current = next;
    setSession(next);
    await saveRaid(storageName, vaultId, vault.round, next).catch(() => undefined);
    setHolding(null);
    if (after === "door") approveDoor();
    else {
      setEnd("door");
      setStage("end");
      setBusy(false);
    }
  }

  function refuse() {
    say("Not approved.");
    setRefused(true);
    sfx.thud();
    const s = scene.current;
    anim(() => {
      rigTo(s, "refuse", 0.22, "power3.out");
      gsap.timeline()
        .fromTo(".redflash", { opacity: 0 }, { opacity: 0.45, duration: 0.06, yoyo: true, repeat: 1 }, 0.05)
        .fromTo(".slam", { scale: 2.6, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.16, ease: E("strike") }, 0)
        .fromTo(".scene", { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.28, ease: "none" }, 0.14)
        .to(".slam", { opacity: 0, duration: 0.3 }, 1.6);
      gsap.delayedCall(1.5, () => rigTo(s, "idle", 0.5));
    });
    setTimeout(() => {
      setBusy(false);
      if (leftRef.current === 0) {
        setEnd("out");
        setTimeout(sfx.turnedAway, 900);
        setTimeout(() => setStage("end"), 900);
      }
    }, 700);
  }

  function approveDoor() {
    setStage("play");
    say("Approved.");
    sfx.approved();
    setTimeout(sfx.clink, 250);
    setTimeout(sfx.creak, 500);
    setTimeout(sfx.whoosh, 650);
    setTimeout(sfx.gotIn, 950);
    setTimeout(() => music.open(), 700);
    const s = scene.current;
    anim(() => {
      rigTo(s, "aside", 0.7, E("settle"));
      gsap.timeline()
        .fromTo(".glint", { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0)
        .to("[data-part=bouncer]", { x: "+=90", duration: D.deliberate, ease: E("settle") }, 0.15)
        .to("[data-part=rope-closed]", { opacity: 0, duration: 0.12 }, 0.3)
        .to("[data-part=rope-open]", { opacity: 1, duration: 0.12 }, 0.3)
        // The doors swing and UV floods out towards the player as the music opens up.
        .to("[data-part=door-leaf-l]", { scaleX: 0.14, transformOrigin: "0% 50%", duration: D.deliberate, ease: E("settle") }, 0.5)
        .to("[data-part=door-leaf-r]", { scaleX: 0.14, transformOrigin: "100% 50%", duration: D.deliberate, ease: E("settle") }, 0.5)
        .to("[data-part=door-light]", { opacity: 0.9, duration: D.deliberate }, 0.5)
        .to("[data-part=door-reflect], [data-part=door-pool]", { opacity: 1, duration: D.deliberate }, 0.6)
        .fromTo(".flood", { opacity: 0, scale: 0.3 }, { opacity: 0.85, scale: 2.4, duration: 1.1, ease: E("arrive") }, 0.7)
        .to(".flood", { opacity: 0.3, duration: 0.8 }, 1.8);
    });
    // One win per raid is all the vault records, so getting in is the ending.
    setTimeout(() => {
      setEnd("door");
      setStage("end");
      setBusy(false);
    }, reduced.current ? 400 : 2400);
  }

  function toggleSound() {
    const on = !sound;
    muted.current = !on;
    writeSoundPref(on);
    setSound(on);
    if (on) sfx.tap();
    setSoundOn(on);
    if (on) music.start("street");
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
      <main className="flex min-h-dvh flex-col bg-night text-chalk">
        <Suspense fallback={null}>
          <TokenBridge token={token} onReady={setTokenLabel} />
        </Suspense>
        <h1 className="sr-only">{signText} · the queue</h1>
        <header className="px-4 pt-4">
          <a href={doorHref} className="chalk-focus inline-flex min-h-11 items-center font-sign text-lg">BOUNCER</a>
        </header>
        {/* A phone on its side keeps a street to look at: the gate scrolls instead of squeezing it away. */}
        <div className="relative min-h-[45dvh] flex-1">
          <StreetScroll bar>
            <SceneLife className="absolute inset-0">
              <DoorScene sign={signText} look={doorLook} setting={setting} neighbors className="size-full" viewBox={STREET_VIEW} />
            </SceneLife>
          </StreetScroll>
        </div>
        {wait === "key" ? (
          <div className="mx-auto w-full max-w-md px-4 py-6 text-center">
            {/* The stakes before the passkey: what is in the pot and what playing costs (QA R20 VS-19). */}
            {potShown.kind === "ready" ? <p className="font-sign text-xl">Tonight&apos;s pot · {potShown.text}</p> : null}
            <p className="mt-1 text-sm text-chalk/80">Free to play with test tokens. Six messages; a bill counts as one.</p>
            <p className="mt-3 text-sm text-chalk/70">Your passkey stays on this device. Clearing this site does not remove it.</p>
            <button
              disabled={busy}
              onClick={() => void startWithPasskey()}
              className="mt-4 w-full rounded-2xl bg-chalk py-4 font-sign text-lg text-ink disabled:opacity-40"
            >
              {busy ? "Waiting for your passkey" : "Use your device passkey"}
            </button>
            <a href={`/passkey?next=play&door=${encodeURIComponent(vaultId)}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
              New here? Create a passkey
            </a>
          </div>
        ) : (
          <p role="status" className="px-4 py-6 text-center text-sm text-chalk/70">{playGateStatus(wait)}</p>
        )}
        <p className="px-4 pb-6 text-center">
          <a href={doorHref} className="chalk-focus inline-flex min-h-11 items-center px-2 text-sm text-chalk/80 underline decoration-white/20">
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
      {/* The raid screen is a picture and a HUD, so its heading is for screen readers. */}
      <h1 className="sr-only">{signText} · round {vault.round}</h1>
      {/* HUD */}
      <header className="z-20 flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:gap-3 sm:px-4">
        <a href={doorHref} className="chalk-focus inline-flex min-h-11 min-w-0 flex-col justify-center leading-none">
          <div className="font-sign text-sm">BOUNCER</div>
          <div className="truncate font-mono text-xs uppercase tracking-wider text-chalk/80 sm:tracking-[0.2em]">
            {signText} · Round {vault.round}
          </div>
        </a>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" aria-label={`${left} messages left`}>
          {Array.from({ length: messageBudget }, (_, i) => (
            <span
              key={i}
              data-chip={i}
              className={`grid size-4 place-items-center rounded-full border-2 font-sign text-[7px] min-[380px]:size-5 min-[380px]:text-[8px] sm:size-6 sm:text-[9px] ${
                i < messageBudget - left ? "border-chalk/15 text-chalk/15" : "border-chalk bg-chalk text-ink shadow-[0_0_10px_rgb(239_232_218/0.35)]"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-full bg-night-3 px-2 py-1 font-mono text-[11px] min-[380px]:flex">
            Round {vault.round}
          </span>
          <HelpButton values={{ budget: messageBudget, lockNs: vault.lockNs }} className="relative grid size-7 shrink-0 place-items-center rounded-full bg-night-3 font-sign text-sm after:absolute after:-inset-2 after:content-['']">
            <span aria-hidden="true">?</span>
            <span className="sr-only">How to play</span>
          </HelpButton>
          <button onClick={toggleSound} data-sound-toggle aria-label={sound ? "Street sound on" : "Street sound off"} className="-my-2 inline-flex min-h-11 shrink-0 items-center whitespace-nowrap" aria-pressed={sound}>
            <span className="rounded-full bg-night-3 px-2 py-1 font-mono text-[11px] sm:px-2.5 sm:text-xs">{sound ? "♪ sound on" : "♪ sound off"}</span>
          </button>
        </div>
      </header>

      {/* The scene: the player writes. Taps do not read a sample ledger. */}
      <section ref={stageRef} className="scene relative min-h-0 flex-1 overflow-hidden bg-[#140f1c]" onClick={onScene}>
        <div ref={scroller} className={`absolute inset-0 [scrollbar-width:none] ${narrow ? "overflow-x-auto overflow-y-hidden" : "overflow-hidden"}`}>
          <div ref={scene} className={`relative h-full ${narrow ? "w-[240%] min-w-[880px]" : ""}`} style={narrow ? undefined : { width: streetW ?? "100%" }}>
            <DoorScene key={streetKey} setting={setting} sign={signText} look={doorLook} gossip={Boolean(session?.street)} speakingSlots={stage === "play" ? speakingSlots : undefined} viewBox={narrow ? STREET_VIEW : doorView} className="absolute inset-0 size-full" />
          </div>
        </div>
        {narrow ? <StreetBar scroller={scroller} /> : null}
        <div className="vignette pointer-events-none absolute inset-0 opacity-0 shadow-[inset_0_0_120px_40px_rgb(179_36_58/0.55)]" />
        <div className="spot pointer-events-none absolute inset-0 opacity-0 bg-[radial-gradient(ellipse_32%_42%_at_50%_58%,transparent_55%,rgb(5_3_8/0.82)_100%)]" />
        <div className="redflash pointer-events-none absolute inset-0 bg-rope opacity-0 mix-blend-screen" />
        <div className="flood pointer-events-none absolute left-1/2 top-[52%] size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 mix-blend-screen bg-[radial-gradient(circle,rgb(185_162_255/0.95),rgb(143_107_255/0.5)_40%,transparent_70%)]" />
        <div aria-hidden="true" className="slam pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 opacity-0">
          {/* Drawn only once a bill is refused, so the page does not carry the word before any bill. */}
          <div className="scale-[2.2]">{refused ? <RefusedStamp /> : null}</div>
        </div>
        {stage === "play" && notes.length === 0 && !bubble && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full bg-chalk px-3 py-1.5 text-center text-[12px] font-semibold text-ink shadow-lg">
            {speakingSlots.some(Boolean)
              ? "Tap a person or use Listen. Listening is free."
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
      </section>

      {stage === "play" && speakingSlots.some(Boolean) && (
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
          {busy && stage !== "held" && <GuardWait />}
        </div>
        {/* The line types out letter by letter, so a screen reader hears it once, whole, when it has arrived. */}
        <p aria-live="polite" className="sr-only">
          {!busy && line !== "…" && typed >= line.length ? `${speaker.name}: ${line}${refused && !/not approved/i.test(line) ? " Not approved." : ""}` : ""}
        </p>
        {you && <div className="mt-1 truncate font-mono text-[11px] text-chalk/45">You: {you}</div>}
        {notice && <p role="status" className="mt-2 text-xs text-chalk/80">{notice}</p>}
        {transcriptError && <p role="status" className="mt-2 text-xs text-chalk/70">Conversation could not be saved or loaded on this device.</p>}
        {transcript.length > 0 && <details className="mt-2 text-xs text-chalk/70"><summary className="cursor-pointer">Conversation on this device</summary><ol tabIndex={0} aria-label="Conversation on this device" className="mt-2 max-h-40 space-y-2 overflow-y-auto">{transcript.map((turn, i) => <li key={i}><p>You: {turn.player}</p><p>Guard: {turn.guard}</p></li>)}</ol></details>}

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
                  maxLength={SAY_MAX}
                  aria-label={`Say something to ${doorName}`}
                  aria-describedby="say-count"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={() => sfx.key()}
                  placeholder={`Say something to ${doorName}…`}
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-night px-3 py-3 text-[15px] outline-none focus:border-chalk/60"
                />
                <button disabled={!draft.trim() || busy || left === 0} className="shrink-0 rounded-xl bg-chalk px-4 font-sign text-ink disabled:opacity-40">
                  Send
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(venueId === "custom" ? (session?.street?.asks?.length ? session.street.asks : SUGGEST_ANY_DOOR) : SUGGEST).map((q) => (
                  <button key={q} type="button" onClick={() => setDraft(q)} className="shrink-0 rounded-full border border-chalk/25 px-3 py-1.5 text-[13px] text-chalk/80">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-chalk/45">
                <span>
                  Each message costs 1 of your {messageBudget}. Listening and the desk are free.{" "}
                  <span id="say-count" className={draft.length >= SAY_MAX ? "text-chalk/80" : ""}>
                    {draft.length >= SAY_MAX - 40 ? `${draft.length} of ${SAY_MAX} characters.` : ""}
                  </span>
                </span>
                <button type="button" onClick={() => setSaying(false)} className="underline">
                  Back
                </button>
              </div>
            </form>
          ) : (
            <>
            {tip === "desk" || tip === "messages" ? (
              <Tip text={tipText(tip, messageBudget)} onDone={(all) => doneTip(tip, all)} className={`mt-3 ${tip === "desk" ? "ml-auto" : ""}`} />
            ) : null}
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
                onClick={() => { sfx.sheet(); setSheet("bill"); }}
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
            </>
          ))}
      </section>

      {stage === "play" && !busy && confirmedLeft === 0 && (
        <p role="status" className="mx-auto mt-3 max-w-lg px-4 text-sm text-chalk/80">No messages left. You can still check your desk.</p>
      )}

      {sheet && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={closeSheet}>
          <div
            ref={sheetPanel}
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "bill" ? "Write a bill" : "Investigation desk"}
            tabIndex={-1}
            className="max-h-[88%] overflow-y-auto outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {sheet === "bill" && tip === "bill" ? (
              <Tip text={tipText("bill")} onDone={(all) => doneTip("bill", all)} className="mx-4 mb-2" />
            ) : null}
            {sheet === "bill" ? (
              <BillBuilder
                payees={session?.street?.payees ?? []}
                currency={tokenSymbol}
                venue={signText}
                left={left}
                onSubmit={handOver}
                draftKey={billDraftKey}
                onClose={() => setSheet(null)}
              />
            ) : (
              <Desk
                notes={notes}
                payees={session?.street?.payees ?? []}
                poster={session?.street?.poster ?? []}
                onPin={(n) => {
                  if (addNote(n)) {
                    sfx.note();
                  }
                }}
                onMark={(id, mark) => setNotes((ns) => ns.map((x) => (x.id === id ? { ...x, mark } : x)))}
                onClose={() => setSheet(null)}
              />
            )}
          </div>
        </div>
      )}

      {stage === "held" && holding && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-30 flex flex-col items-center justify-end bg-[linear-gradient(to_bottom,rgb(13_10_18/0.35)_0%,rgb(13_10_18/0.92)_25%,rgb(13_10_18/0.99)_45%)] px-6 pb-8 text-center">
          <h1 className="font-sign text-4xl leading-none">Approved.</h1>
          <AmountLine shown={cutShown} empty="No signed amount yet." className="text-2xl text-chalk" block />
          <p className="mt-3 max-w-sm text-sm text-chalk/70">
            {holding.sending
              ? "Recording the verdict with the vault…"
              : `${holding.message ?? "The vault did not record the verdict."} The signed verdict stays on this device.`}
          </p>
          <p className="mt-2 max-w-sm text-xs text-chalk/55">You are not in until the vault records it.</p>
          <div className="mt-5 flex w-full max-w-sm flex-col gap-3">
            {!holding.sending && holding.retry && (
              <button
                onClick={() => void recordHeld(holding.after)}
                className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483] transition active:translate-y-1"
              >
                Send it again
              </button>
            )}
            {!holding.sending && (
              <a href={doorHref} className="rounded-2xl border border-chalk/30 py-3 text-sm">
                The door
              </a>
            )}
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
          claimHref={doorPaths(vaultId).claim}
          crackCount={vault.crackCount}
          closesAt={vault.closesAt}
          doorHref={doorHref}
          revealHref={doorPaths(vaultId).reveal}
          others={others}
          token={token}
          seed={session?.raidId ?? vaultId}
          budget={messageBudget}
          lockNs={vault.lockNs}
          vaultId={vaultId}
          storageName={storageName}
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
  claimHref,
  crackCount,
  closesAt,
  doorHref,
  revealHref,
  others,
  token,
  seed,
  budget,
  lockNs,
  vaultId,
  storageName,
}: {
  lockNs: string;
  vaultId: string;
  storageName: string;
  budget: number;
  revealHref: string;
  others?: Promise<ListedDoor[]>;
  token: Promise<TokenRead>;
  seed: string;
  end: End;
  cutText: string | null;
  currency: string;
  amountNote?: string | null;
  grid: Decision[];
  signature: string | null;
  round: string;
  venueId: string;
  guardName: string;
  claimHref: string;
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
  const standing = useStanding();
  // The win was just recorded, so the lock opens about one lock length from now. The claim page reads the exact time.
  const [unlockAtNs] = useState(() => (BigInt(Date.now()) * 1_000_000n + BigInt(/^[0-9]+$/.test(lockNs) ? lockNs : "0")).toString());
  const unlocked = useReached(unlockAtNs);
  const filled = grid.length ? grid : Array<Decision>(budget).fill("ask");
  useEffect(() => {
    // This browser keeps the night it just finished, so /share can show it again.
    writeLastShare(storageName, { kind: end === "out" ? "out" : "in", sign: venueId, guard: guardName !== venueId ? guardName : null, grid: end === "out" ? filled : grid, streak: standing.streak, vaultId, budget, at: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standing.streak]);
  if (end === "out") {
    return (
      <div ref={ref} className="absolute inset-0 z-30 flex flex-col items-center justify-end overflow-y-auto bg-[linear-gradient(to_bottom,rgb(13_10_18/0.1)_0%,rgb(13_10_18/0.85)_15%,rgb(13_10_18/0.99)_30%)] px-6 pb-8 text-center">
        <Suspense fallback={<TurnedAway sign={venueId} guardName={guardName} grid={grid.length ? grid : Array<Decision>(budget).fill("ask")} sq={sq} line={lastWord(null, seed)} rivals={[]} token={token} closesAt={closesAt} revealHref={revealHref} doorHref={doorHref} />}>
          <TurnedAwayWithRivals sign={venueId} guardName={guardName} grid={grid.length ? grid : Array<Decision>(budget).fill("ask")} sq={sq} seed={seed} others={others} token={token} closesAt={closesAt} revealHref={revealHref} doorHref={doorHref} />
        </Suspense>
      </div>
    );
  }
  const message = winningMessage(grid);
  const shareGrid = grid.length ? grid : (["approved"] as Decision[]);
  const text = shareText({ kind: "in", sign: venueId, guard: guardName !== venueId ? guardName : null, grid: shareGrid, streak: standing.streak }, budget);
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-30 flex flex-col items-center justify-end overflow-y-auto bg-[linear-gradient(to_bottom,rgb(13_10_18/0.1)_0%,rgb(13_10_18/0.6)_30%,rgb(13_10_18/0.97)_55%)] px-6 pb-8 text-center"
    >
      <ApprovedStamp
        signature={stamp}
        ring={`${venueId.toUpperCase()} · #${round} · DOOR · ${stamp ? shortHash(stamp).toUpperCase() : ""} · `}
        size={150}
        className="end-stamp"
      />
      <h1 className="end-title mt-5 font-sign text-5xl leading-none">You got in.</h1>
      <figure className="end-rest mt-4 max-w-sm">
        <blockquote className="relative rounded-2xl border border-white/20 bg-night-2 px-4 py-3 text-left font-sign text-lg leading-snug text-chalk">
          &ldquo;{winWord(seed)}&rdquo;
          <span aria-hidden className="absolute -top-2 left-8 size-4 rotate-45 border-l border-t border-white/20 bg-night-2" />
        </blockquote>
        <figcaption className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">{guardName}, on the door</figcaption>
      </figure>
      <div className="end-rest mt-4 flex items-center gap-1.5" aria-label={message ? `Got in on message ${message} of ${budget}` : "Your messages"}>
        {shareGrid.map((d, i) => (
          <span key={i} className={`size-4 rounded ${sq[d]}`} />
        ))}
        {message ? <span className="ml-2 font-mono text-xs text-chalk/70">in on {message} / {budget}</span> : null}
      </div>
      {standing.line ? <p className="end-rest mt-2 text-sm text-brass">{standing.line}</p> : null}
      <div className="end-rest end-cut mt-4">
        <div className="font-mono text-xs uppercase tracking-[0.25em] text-chalk/80">Your cut</div>
        {amountNote ? <p className="text-sm text-chalk/60">{amountNote}</p> : cutText ? <Money text={cutText} currency={currency} className="neon-brass text-4xl" /> : <p className="text-sm text-chalk/60">No signed amount.</p>}
        <p className="mt-1 text-sm text-chalk/70">
          {unlocked ? "The vault has recorded it, and the time lock is open." : <>The vault has recorded it. Collect in about <Countdown endsAtNs={unlockAtNs} className="text-chalk" />.</>}
        </p>
      </div>
      <div className="end-rest mt-5 flex w-full max-w-sm flex-col gap-3">
        <a href={claimHref} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
          {unlocked ? "Claim your cut" : "Collect when the lock opens"}
        </a>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ShareButton text={text} url={doorHref} label="Share your night" className="rounded-2xl border border-chalk/30 px-5 py-3 font-sign" />
        </div>
        <a href="/home" className="text-sm text-chalk/70 underline decoration-white/20">
          Try another door tonight
        </a>
      </div>
      <DemoBadge className="end-rest mt-4" />
    </div>
  );
}

/** The signed-in player's streak and board place, read once from the player record. */
function useStanding(): { streak: number; line: string | null } {
  const [standing, setStanding] = useState<{ streak: number; line: string | null }>({ streak: 0, line: null });
  useEffect(() => {
    let live = true;
    void readHold().then((held) => {
      if (!held || !live) return;
      held.fill(0);
      loadPlayerSession().then((result) => {
        if (!live || !result.ok) return;
        const { streak } = result.session.player;
        const place = result.session.place;
        setStanding({ streak, line: `Tonight still counts${streak > 0 ? ` · ${streak}-day streak` : ""}${place ? ` · #${place} on the board` : ""}` });
      }).catch(() => undefined);
    });
    return () => { live = false; };
  }, []);
  return standing;
}

type TurnedAwayProps = {
  sign: string;
  guardName: string;
  grid: Decision[];
  sq: Record<Decision, string>;
  token: Promise<TokenRead>;
  closesAt: string;
  revealHref: string;
  doorHref: string;
};

function TurnedAwayWithRivals({ others, seed, ...rest }: TurnedAwayProps & { others?: Promise<ListedDoor[]>; seed: string }) {
  const rivals = others ? use(others) : [];
  const first = rivals[0];
  return <TurnedAway {...rest} rivals={rivals} line={lastWord(first ? { sign: first.sign, guard: first.card?.name ?? null, pot: null } : null, seed)} />;
}

/**
 * The ending when the messages run out. The bouncer has a last word that names a real open door, the
 * other doors are one tap away, the ledger is something to come back for, and the streak still counts.
 * Nothing here says what was wrong with a bill.
 */
function TurnedAway({ sign, guardName, grid, sq, line, rivals, token, closesAt, revealHref, doorHref }: TurnedAwayProps & { line: string; rivals: ListedDoor[] }) {
  const { streak, line: standing } = useStanding();
  const dare = shareText({ kind: "out", sign, guard: guardName !== sign ? guardName : null, grid, streak }, grid.length);
  const tried = grid.length;
  const [first, ...more] = rivals;
  return (
    <>
      <div className="end-stamp">
        <TurnedAwayStamp />
      </div>
      <figure className="end-title mt-5 max-w-sm">
        <blockquote className="relative rounded-2xl border border-white/20 bg-night-2 px-4 py-3 text-left font-sign text-lg leading-snug text-chalk">
          &ldquo;{line}&rdquo;
          <span aria-hidden className="absolute -top-2 left-8 size-4 rotate-45 border-l border-t border-white/20 bg-night-2" />
        </blockquote>
        <figcaption className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-chalk/70">{guardName}, on the door</figcaption>
      </figure>
      <div className="end-rest mt-4 flex items-center gap-1.5" aria-label={`${tried} of ${tried} messages used`}>
        {grid.map((d, i) => (
          <span key={i} className={`size-4 rounded ${sq[d]}`} />
        ))}
        <span className="ml-2 font-mono text-xs text-chalk/70">{tried} / {tried} tried</span>
      </div>
      {standing ? <p className="end-rest mt-2 text-sm text-brass">{standing}</p> : null}
      <div className="end-rest mt-5 flex w-full max-w-sm flex-col gap-3">
        {first ? (
          <a href={first.href} className="rounded-2xl bg-chalk py-4 font-sign text-lg text-ink shadow-[0_6px_0_#9c9483]">
            Try {first.sign}
            {first.dayPot ? <span className="block font-mono text-xs uppercase tracking-wider">Tonight&apos;s pot · <TokenAmount token={token} atomic={first.dayPot} className="normal-case text-ink" /></span> : null}
          </a>
        ) : null}
        {more.length ? (
          <div className="grid grid-cols-2 gap-2">
            {more.map((door) => (
              <a key={door.id} href={door.href} className="rounded-2xl border border-white/15 px-3 py-2 text-left">
                <span className="block truncate font-sign text-sm">{door.sign}</span>
                {door.dayPot ? <TokenAmount token={token} atomic={door.dayPot} className="text-xs text-brass" /> : null}
              </a>
            ))}
          </div>
        ) : null}
        <div className="flex justify-center">
          <ShareButton text={dare} url={doorHref} label="Dare a friend" className="rounded-2xl border border-chalk/30 px-5 py-3 font-sign" />
        </div>
        <a href={revealHref} className="rounded-2xl border border-chalk/30 px-4 py-3 text-sm">
          The ledger opens in <Countdown endsAtNs={closesAt} className="text-chalk" />. See which bill would have got in.
        </a>
        <a href={first ? "/home" : doorHref} className="text-sm text-chalk/70 underline decoration-white/20">
          {first ? "All of tonight's doors" : "Back to the door"}
        </a>
        {first ? null : (
          <a href="/vip" className="text-sm text-chalk/70 underline decoration-white/20">
            See every door
          </a>
        )}
      </div>
      <DemoBadge className="end-rest mt-4" />
    </>
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

/** `answered` is false only when no reply came back, so the same call can be sent again. */
async function postGuard(body: Record<string, unknown>, auth?: string): Promise<{ payload: Record<string, unknown>; answered: boolean }> {
  const result = auth ? await apiPost("/guard", body, () => ({ "x-player-auth": auth })) : await apiPost("/guard", body);
  const answered = result.ok && result.status < 500 && Boolean(result.body) && typeof result.body === "object";
  return { payload: asObject(result), answered };
}


/** The guard reads up to this many characters of one message. */
const SAY_MAX = 200;

/** The bill as the player sees it echoed: prices with two decimals and the pot's token. */
function billEcho(b: DraftBill, symbol: string): string {
  const total = (Math.round(b.qty * b.unit * 100) / 100).toFixed(2);
  return `BILL: ${b.payee} · ${b.reference} · ${b.item} · ${b.qty} × ${b.unit.toFixed(2)} = ${total}${symbol ? ` ${symbol}` : ""}`;
}

/** Guard error codes as sentences. A message the guard did not count was given back. */
function guardNotice(error: string): string {
  if (error === "replay") return "This raid moved on in another tab or after a refresh. Reload the page to pick it up.";
  if (error === "spent") return "No messages left.";
  if (error === "sponsor") return "You sponsor this door, so you cannot raid it. Try another door.";
  if (error === "full") return "Tonight's cut has been taken. Nothing is left to win, and no message was used.";
  if (error === "closed") return "This round has closed. No message was used.";
  if (error === "model") return "The guard did not answer. No message was used. Try again.";
  if (error === "busy" || error.startsWith("The door is busy")) return "The door is busy. No message was used. Try again in a minute.";
  return "The door did not answer. No message was used. Try again.";
}

/** A guard reply can take most of a minute. The line moves on so a long wait does not look stuck. */
function GuardWait() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const text = seconds < 8 ? "Waiting for the guard…" : seconds < 25 ? "The guard is reading it." : "Still reading. This can take up to a minute.";
  return (
    <span role="status" className="max-w-[9rem] text-right text-xs text-chalk/70">
      {text}
      {seconds >= 8 ? <span className="block font-mono text-[10px] text-chalk/50">{seconds}s</span> : null}
    </span>
  );
}
