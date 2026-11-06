/** A sponsor's public card. Plain text and small indexes only. Nothing here is ever rendered as HTML or a link. */

import { HEAD_COLORS, PARTS, SKINS, type Look } from "./look.ts";
import { readSetting, type StreetSetting } from "./street-setting.ts";

export type CardLook = { build: number; skin: number; head: number; outfit: number; eyewear: number };
export type Card = { sign: string; name: string; pitch: string; look: CardLook; setting: StreetSetting };

export const MAX_SIGN = 24;
export const MAX_NAME = 24;
export const MAX_PITCH = 160;

const SIGN = /^[A-Z0-9][A-Z0-9 .'&-]*$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9 .'-]*$/;
/** Locked outfits are earned, so a card cannot ask for them. */
const OUTFITS = PARTS.outfit.filter((item) => !item.locked).length;

const DEFAULT_LOOK: CardLook = { build: 0, skin: 1, head: 0, outfit: 0, eyewear: 0 };

export function parseCard(text: string | null | undefined): { ok: true; card: Card } | { ok: false } {
  if (typeof text !== "string" || text.length === 0 || text.length > 2000) return { ok: false };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  const row = raw as Record<string, unknown>;
  if (row.v !== 1) return { ok: false };
  const sign = typeof row.sign === "string" ? row.sign : "";
  const name = typeof row.name === "string" ? row.name : "";
  const pitch = typeof row.pitch === "string" ? row.pitch : "";
  if (!validSign(sign) || !validName(name) || !validPitch(pitch)) return { ok: false };
  return { ok: true, card: { sign, name, pitch, look: readLook(row.look), setting: readSetting(row.setting) } };
}

export function buildCard(card: Card, maxBytes: number): { ok: true; text: string } | { ok: false; error: string } {
  if (!validSign(card.sign)) return { ok: false, error: `The sign is 1 to ${MAX_SIGN} capitals, digits, spaces, and . ' & -.` };
  if (!validName(card.name)) return { ok: false, error: `The guard's name is 1 to ${MAX_NAME} letters, digits, spaces, and . ' -.` };
  if (!validPitch(card.pitch)) return { ok: false, error: `The pitch is 1 to ${MAX_PITCH} characters of plain text.` };
  const text = JSON.stringify({
    v: 1,
    sign: card.sign,
    name: card.name,
    pitch: card.pitch,
    look: readLook(card.look),
    setting: readSetting(card.setting),
  });
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, error: `The card is larger than ${maxBytes} bytes.` };
  return { ok: true, text };
}

/** The guard's look. A value outside its list falls back to the default, so a bad card still draws. */
export function cardLook(card: Card): Look {
  const look = card.look;
  const build = PARTS.build[look.build] ?? PARTS.build[0];
  const head = PARTS.head[look.head] ?? PARTS.head[0];
  const eyewear = PARTS.eyewear[look.eyewear] ?? PARTS.eyewear[0];
  const outfit = PARTS.outfit[look.outfit] ?? PARTS.outfit[0];
  return {
    name: card.name,
    catchphrase: card.pitch,
    build: build.value,
    skin: look.skin,
    head: head.value,
    headColor: HEAD_COLORS[look.head % HEAD_COLORS.length],
    eyewear: eyewear.value,
    outfit: outfit.value,
    earpiece: true,
    extra: "none",
  };
}

function readLook(value: unknown): CardLook {
  if (!value || typeof value !== "object") return { ...DEFAULT_LOOK };
  const row = value as Record<string, unknown>;
  return {
    build: index(row.build, PARTS.build.length, DEFAULT_LOOK.build),
    skin: index(row.skin, SKINS.length, DEFAULT_LOOK.skin),
    head: index(row.head, PARTS.head.length, DEFAULT_LOOK.head),
    outfit: index(row.outfit, OUTFITS, DEFAULT_LOOK.outfit),
    eyewear: index(row.eyewear, PARTS.eyewear.length, DEFAULT_LOOK.eyewear),
  };
}

function index(value: unknown, length: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length ? value : fallback;
}

function validSign(value: string): boolean {
  return value.length >= 1 && value.length <= MAX_SIGN && SIGN.test(value);
}

function validName(value: string): boolean {
  return value.length >= 1 && value.length <= MAX_NAME && NAME.test(value);
}

function validPitch(value: string): boolean {
  if (value.trim().length === 0 || value.length > MAX_PITCH) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\u0000-\u001f\u007f<>]/.test(value);
}
