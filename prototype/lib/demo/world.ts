import type { DraftBill } from "@/lib/bill";
import type { Card, CardLook } from "@/lib/card";
import { CROWDS } from "@/lib/crowds";
import { doorFull, doorShut } from "@/lib/door";
import type { ListedDoor } from "@/lib/door-index";
import { doorPaths } from "@/lib/door-read";
import type { TokenRead } from "@/lib/page-vault";
import { BOARDS, PASSERS, POSTERS, QUEUES, RIDES, SELLERS, SHOPS, SOUNDS, STALLS, WEATHERS } from "@/lib/street-kit";
import { ACCRA_SETTING, PLACES, SETTING_FIELDS, type Place, type StreetSetting } from "@/lib/street-setting";
import type { VaultView } from "@/lib/vault";
import { DEMO_NOW_MS, demoNowMs, msToNs } from "./clock";

/** Fictional. Not a testnet account, a key, or a transaction. */
export const HASH = "c0ffee11".repeat(8);
export const GUARD_PK = "ab".repeat(32);
export const POT = "20000000";
// The cut and its bill match the real win in REAL_WIN, so the payment link shows the same amount.
export const CUT = "3240000";
export const LOCK_NS = (10n * 60n * 1_000_000_000n).toString();
// Rounds close at the next 00:00 UTC (vault commit_round). The demo clock is 21:00 UTC, so three hours on.
export const CLOSE_NS = msToNs(DEMO_NOW_MS + 3 * 60 * 60 * 1000);
export const OPENED_NS = msToNs(DEMO_NOW_MS - 2 * 60 * 60 * 1000);
export const UNLOCK_NS = msToNs(DEMO_NOW_MS + 10 * 60 * 1000);
export const TOKEN: Promise<TokenRead> = Promise.resolve({ ok: true, symbol: "tUSDC", decimals: 6 });

export const RIGHT_BILL: DraftBill = { payee: "Harbour Ice Supply", reference: "ICE-4418", item: "ice delivery", qty: 4, unit: 0.81 };
// The out-of-date reference from the street: a player who trusts it is refused.
export const WRONG_BILL: DraftBill = { payee: "Harbour Ice Supply", reference: "ICE-9031", item: "ice delivery", qty: 4, unit: 0.81 };

/** A clue door's street, in the guard's own sentences (guard clues.rs): the owed bill in pieces, a paid line, and an out-of-date reference. */
export const STREET_QUEUE: { who: string; lines: { text: string; note: string }[] }[] = [
  { who: "Marcus", lines: [
    { text: "Harbour Ice Supply brought the ice delivery and still hasn't been paid for it.", note: "Harbour Ice Supply brought the ice delivery and still hasn't been paid for it. (Marcus)" },
    { text: "Lantern Oil got paid this week. Showed everyone.", note: "Lantern Oil got paid this week. Showed everyone. (Marcus)" },
  ] },
  { who: "Priya", lines: [
    { text: "The Harbour Ice Supply invoice number starts ICE-44.", note: "The Harbour Ice Supply invoice number starts ICE-44. (Priya)" },
    { text: "Harbour Ice Supply's invoice was ICE-9031, last I saw.", note: "Harbour Ice Supply's invoice was ICE-9031, last I saw. (Priya)" },
  ] },
  { who: "Jade", lines: [
    { text: "The ice delivery invoice ended 18. I saw it on the bar.", note: "The ice delivery invoice ended 18. I saw it on the bar. (Jade)" },
    { text: "The lamp oil invoice ended 07.", note: "The lamp oil invoice ended 07. (Jade)" },
  ] },
  { who: "Callum", lines: [
    { text: "4 × ice delivery on tonight's order.", note: "4 × ice delivery on tonight's order. (Callum)" },
    { text: "Harbour Ice Supply sent out new invoices this week. New numbers on all of them.", note: "Harbour Ice Supply sent out new invoices this week. New numbers on all of them. (Callum)" },
    { text: "Ask the guard the rate for ice delivery. The guard knows it.", note: "Ask the guard the rate for ice delivery. The guard knows it. (Callum)" },
  ] },
];

/** The door's question, and the guard's fixed answer to it (guard clues.rs chip). */
export const ASK = "What's the rate for ice delivery tonight?";
export const RATE_REPLY = "The rate for ice delivery is 0.81 a unit tonight.";
/**
 * A real win on NEAR testnet, for the payment link and the Wins page. Everything else in this world is demo data.
 * skyline-social on bouncer-doors.testnet, round 1, player QuietDoor58, 11 Nov 2026 (QA r25 report, transaction table).
 */
export const REAL_WIN = {
  contract: "bouncer-doors.testnet",
  vaultId: "skyline-social",
  round: "1",
  amount: "3240000",
  verdictTx: "EKAiV5tLiXTJVkjUMvEuQbEPBZX3SsKHBE5QQbdjrxNc",
  claimTx: "3tfVYCR6NAUTugkPNZ7eYFnsjXJ232XjK5425EbPSuHY",
  payee: "p9ce1cd755afc.relay.aduakorful.testnet",
} as const;

export const STREET_PAYEES = ["Harbour Ice Supply", "Lantern Oil", "Quayside Glassware"];

const LOOK: CardLook = { build: 0, skin: 1, head: 0, outfit: 0, eyewear: 0 };

export type DoorKind = "open" | "closed" | "taken" | "never";

type Spec = {
  id: string;
  sign: string;
  name: string;
  kind: DoorKind;
  pot: string;
  look?: CardLook;
  pitch?: string;
  setting?: StreetSetting;
};

const SPECS: Spec[] = [
  // The video's door: the public card of skyline-social on bouncer-doors.testnet, where the real win in REAL_WIN was paid.
  {
    id: "skyline-social", sign: "SKYLINE SOCIAL", name: "Delroy", kind: "open", pot: POT,
    look: { build: 0, skin: 0, head: 6, outfit: 0, eyewear: 2 },
    pitch: "A rooftop bar above Peckham. It is raining, the heaters are on, and Delroy is not in a hurry. One supplier still has not been paid.",
    setting: { place: 2, crowd: 1, queue: 0, stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, posters: 3, board: 3, weather: 1, sound: 1 },
  },
  { id: "labadi-tide", sign: "LABADI TIDE", name: "Kofi Mensah", kind: "open", pot: "15000000", look: { ...LOOK, skin: 2, outfit: 1 } },
  { id: "ridge-canteen", sign: "RIDGE CANTEEN", name: "Yaa Boateng", kind: "open", pot: "8000000", look: { ...LOOK, skin: 3, head: 1 } },
  { id: "salt-market", sign: "SALT MARKET", name: "Kojo Ames", kind: "open", pot: "5000000", look: { ...LOOK, skin: 4, eyewear: 1 } },
  { id: "osu-after", sign: "OSU AFTER DARK", name: "Esi Quaye", kind: "closed", pot: "0", look: { ...LOOK, outfit: 2 } },
  { id: "coastline-night", sign: "COASTLINE NIGHT", name: "Yaw Mensah", kind: "taken", pot: "10000000", look: { ...LOOK, skin: 5 } },
  { id: "warehouse-four", sign: "warehouse-four", name: "", kind: "never", pot: "0" },
];

export function doorSpec(id: string): Spec | null {
  return SPECS.find((door) => door.id === id) ?? null;
}

export function frontId(): string {
  return "skyline-social";
}

const CAP = "20000000";
const MAX_CRACKS = 1;
/** Fictional sponsor money left in reserve after tonight's draw. */
const RESERVE = "30000000";

/**
 * Follows the vault's money rules (plan 81): commit_round draws min(max_cracks × cap, reserve) into tonight's pot, so a
 * door whose pot is under that drew everything and has nothing left in reserve. A taken door holds its winner's cut.
 */
export function makeVault(kind: DoorKind, pot: string): VaultView {
  const open = kind === "open" || kind === "taken";
  const drewAll = BigInt(pot) < BigInt(CAP) * BigInt(MAX_CRACKS);
  return {
    sponsor: "skyline-social.testnet",
    pot: kind === "never" ? "0" : kind === "closed" ? RESERVE : drewAll ? "0" : RESERVE,
    dayPot: kind === "open" ? pot : "0",
    reserved: kind === "taken" ? pot : "0",
    cap: CAP,
    lockNs: LOCK_NS,
    rule: "PayTheBill",
    guardPk: GUARD_PK,
    commitment: kind === "never" ? null : HASH,
    guardVersion: "1",
    round: kind === "never" ? "0" : "1",
    opensAt: kind === "never" ? "0" : OPENED_NS,
    closesAt: CLOSE_NS,
    open,
    challengeEnd: null,
    maxCracks: MAX_CRACKS,
    ticketed: false,
    closedPendingBump: false,
    refundInFlight: "0",
    crackCount: kind === "taken" ? 1 : 0,
    keeper: kind === "never" ? null : "keeper.skyline-social.testnet",
    specHash: HASH,
    card: kind === "never" ? null : "{}",
    specLocked: kind !== "never",
    suspended: false,
  };
}

export function makeCard(spec: Spec, setting: StreetSetting = baseSetting(spec)): Card | null {
  if (spec.kind === "never") return null;
  return { sign: spec.sign, name: spec.name, pitch: spec.pitch ?? "", look: spec.look ?? LOOK, setting };
}

/** A door's own street, before any query overrides. */
export function baseSetting(spec: Spec | null): StreetSetting {
  return { ...(spec?.setting ?? ACCRA_SETTING) };
}

function listLine(vault: VaultView): { line: string; shut: boolean } {
  if (vault.suspended) return { line: "Suspended", shut: true };
  const shut = doorShut(vault, demoNowMs());
  if (!vault.open && vault.opensAt === "0" && !vault.commitment) return { line: "Not opened yet", shut: true };
  if (!shut && doorFull(vault)) return { line: "Taken tonight", shut: true };
  return { line: shut ? "Closed" : "Open", shut };
}

export function listedDoor(spec: Spec, setting?: StreetSetting): ListedDoor {
  const vault = makeVault(spec.kind, spec.pot);
  const card = makeCard(spec, setting);
  const state = listLine(vault);
  return {
    id: spec.id,
    href: doorPaths(spec.id).door,
    sign: card?.sign || spec.id,
    name: card?.name ?? "",
    line: state.line,
    shut: state.shut,
    sponsored: vault.specHash !== null,
    read: true,
    card,
    dayPot: vault.dayPot,
    round: vault.round,
    closesAt: vault.closesAt,
  };
}

export function allDoors(setting?: StreetSetting): ListedDoor[] {
  return SPECS.map((spec) => listedDoor(spec, setting));
}

export function otherDoors(id: string): ListedDoor[] {
  return allDoors().filter((door) => door.id !== id);
}

export function openRivals(id: string): ListedDoor[] {
  return otherDoors(id).filter((door) => !door.shut);
}

const CATALOGS = { stall: STALLS, ride: RIDES, passer: PASSERS, seller: SELLERS, shop: SHOPS, posters: POSTERS, board: BOARDS, weather: WEATHERS, sound: SOUNDS, queue: QUEUES } as const;

/** Query indexes and names, only for options the sponsor form already offers. */
export function settingFrom(base: StreetSetting, query: Record<string, string>): StreetSetting {
  const next: StreetSetting = { ...base };
  for (const field of SETTING_FIELDS) {
    const raw = query[field.key];
    if (!raw) continue;
    const byLabel = field.options.findIndex((label) => label.toLowerCase() === raw.toLowerCase());
    const asNumber = /^\d+$/.test(raw) ? Number(raw) : -1;
    const index = byLabel >= 0 ? byLabel : asNumber;
    if (index >= 0 && index < field.options.length) next[field.key] = index;
  }
  if (query.place) {
    const id = PLACES.indexOf(query.place as Place);
    if (id >= 0) next.place = id;
  }
  if (query.crowd) {
    const id = CROWDS.findIndex((crowd) => crowd.id === query.crowd || crowd.label.toLowerCase() === query.crowd.toLowerCase());
    if (id >= 0) next.crowd = id;
  }
  for (const [key, options] of Object.entries(CATALOGS) as [keyof typeof CATALOGS, readonly { id: string }[]][]) {
    const raw = query[key];
    if (!raw) continue;
    const id = options.findIndex((option) => option.id === raw);
    if (id >= 0) next[key] = id;
  }
  return next;
}

export const PLAYERS = [
  { name: "LabadiNight", place: 1, nights: 12, streak: 5 },
  { name: "KofiTide", place: 2, nights: 8, streak: 4 },
  { name: "RyeLaneRuby", place: 2, nights: 8, streak: 4 },
  { name: "AmberQuay", place: 4, nights: 6, streak: 3 },
  { name: "QuayNight", place: 5, nights: 2, streak: 1 },
] as const;

export const YOU = "AmberQuay";

export function shareLine(name: string, place: number, nights: number, streak: number): string {
  const teen = place % 100;
  const last = place % 10;
  const ordinal = teen >= 11 && teen <= 13 ? `${place}th` : last === 1 ? `${place}st` : last === 2 ? `${place}nd` : last === 3 ? `${place}rd` : `${place}th`;
  return `${name} · ${ordinal} on Bouncer · ${nights} ${nights === 1 ? "night" : "nights"} in · ${streak}-day streak`;
}

export const BOARD_RULE = "Ranked by nights in, then by streak. Players level on both share a place.";
export const WEEK_RULE = "This week: nights got in over the last seven days, then streak. Resets as days pass.";

export const LEDGER = [
  { payee: "Harbour Ice Supply", reference: "ICE-4418", item: "ice delivery", total: "3240000", paid: false },
  { payee: "Lantern Oil", reference: "LO-2207", item: "lamp oil", total: "6000000", paid: true },
  { payee: "Quayside Glassware", reference: "QG-5126", item: "glassware", total: "4800000", paid: false },
];

/** The list title HomeIndex in web/components/gates.tsx gives the other doors. */
export function othersTitle(exclude: string): string {
  const open = otherDoors(exclude).filter((door) => !door.shut).length;
  return open ? `Other doors · ${open} open tonight` : "Other doors";
}
