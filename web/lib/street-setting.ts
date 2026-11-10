/**
 * A door's street. Small indexes into the catalogs in street-kit.ts, mixed freely. Missing or bad values
 * stay the Accra street. `place` is the kind of venue and `crowd` is how the queue dresses.
 */

import { type CityId } from "./cities.ts";
import { CROWDS } from "./crowds.ts";
import {
  BOARDS,
  PASSERS,
  POSTERS,
  QUEUES,
  RIDES,
  SELLERS,
  SHOPS,
  SOUNDS,
  STALLS,
  WEATHERS,
  type BoardId,
  type Learn,
  type PasserId,
  type PosterId,
  type QueueId,
  type RideId,
  type SellerId,
  type ShopId,
  type SoundId,
  type StallId,
  type WeatherId,
} from "./street-kit.ts";

export type StreetSetting = {
  stall: number;
  ride: number;
  passer: number;
  seller: number;
  shop: number;
  weather: number;
  posters: number;
  sound: number;
  place: number;
  crowd: number;
  queue: number;
  board: number;
};

/** Kinds of venue. A card stores the index, so places are only ever added at the end. */
export const PLACES = ["street", "beach", "rooftop", "basement", "garden", "warehouse", "harbour", "lounge"] as const;
export const PLACE_LABELS: Record<Place, string> = {
  street: "Street front",
  beach: "Beach bar",
  rooftop: "Rooftop",
  basement: "Basement",
  garden: "Garden party",
  warehouse: "Warehouse",
  harbour: "Harbour front",
  lounge: "Hotel lounge",
};
export type Place = (typeof PLACES)[number];

export const ACCRA_SETTING: StreetSetting = {
  stall: 0,
  ride: 0,
  passer: 0,
  seller: 0,
  shop: 0,
  weather: 0,
  posters: 0,
  sound: 0,
  place: 0,
  crowd: 0,
  queue: 0,
  board: 0,
};

const labels = (list: readonly { label: string }[]) => list.map((item) => item.label);

/** The sponsor form draws one menu per field, in this order. Every catalog entry is a choice. */
export const SETTING_FIELDS = [
  { key: "place", label: "Place", options: PLACES.map((place) => PLACE_LABELS[place]) },
  { key: "crowd", label: "Crowd", options: CROWDS.map((crowd) => crowd.label) },
  { key: "queue", label: "Queue", options: labels(QUEUES) },
  { key: "stall", label: "Food stall", options: labels(STALLS) },
  { key: "ride", label: "Parked ride", options: labels(RIDES) },
  { key: "passer", label: "Passing by", options: labels(PASSERS) },
  { key: "seller", label: "Seller in the queue", options: labels(SELLERS) },
  { key: "shop", label: "Shop next door", options: labels(SHOPS) },
  { key: "posters", label: "Posters", options: labels(POSTERS) },
  { key: "board", label: "Pot board", options: labels(BOARDS) },
  { key: "weather", label: "Sky", options: labels(WEATHERS) },
  { key: "sound", label: "Sound", options: labels(SOUNDS) },
] as const satisfies readonly { key: keyof StreetSetting; label: string; options: readonly string[] }[];

/**
 * Whether a piece is drawn at this place. Away from the street the ride, the traffic and the shop give way to
 * the place's own, and a place with a bar has no food stall. The form still keeps the pick for later.
 */
export function pieceDrawn(key: keyof StreetSetting, place: Place): boolean {
  if (place === "street") return true;
  if (key === "ride" || key === "passer" || key === "shop") return false;
  // A basement has no sky to put weather in.
  if (key === "weather") return place !== "basement";
  if (key === "stall") return place === "beach" || place === "harbour";
  return true;
}

/** A random street, for the sponsor form's Surprise me. */
export function randomSetting(random: () => number = Math.random): StreetSetting {
  const pick = (key: keyof StreetSetting) => Math.floor(random() * COUNTS[key]);
  return {
    stall: pick("stall"),
    ride: pick("ride"),
    passer: pick("passer"),
    seller: pick("seller"),
    shop: pick("shop"),
    weather: pick("weather"),
    posters: pick("posters"),
    sound: pick("sound"),
    place: pick("place"),
    crowd: pick("crowd"),
    queue: pick("queue"),
    board: pick("board"),
  };
}

const COUNTS: Record<keyof StreetSetting, number> = {
  stall: STALLS.length,
  ride: RIDES.length,
  passer: PASSERS.length,
  seller: SELLERS.length,
  shop: SHOPS.length,
  weather: WEATHERS.length,
  posters: POSTERS.length,
  sound: SOUNDS.length,
  place: PLACES.length,
  crowd: CROWDS.length,
  queue: QUEUES.length,
  board: BOARDS.length,
};

/** The whole street, from the food stall through the shop and the taxi. */
export const STREET_VIEW = "-230 -40 900 320";

export type PosterSlips = {
  purple: [string, string, string];
  cream: [string, string, string, string];
  flag: [string, string];
  wall: string;
  sign: string;
  signSize: number;
};

export type StreetPieces = {
  stall: StallId;
  ride: RideId;
  passer: PasserId;
  seller: SellerId;
  shop: ShopId;
  weather: WeatherId;
  posters: PosterId;
  sound: SoundId;
  place: Place;
  /** The id of an entry in CROWDS. */
  crowd: string;
  queue: QueueId;
  board: BoardId;
};

export function citySetting(city: CityId): StreetSetting {
  if (city === "london") {
    return { ...ACCRA_SETTING, stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, weather: 1, posters: 1, sound: 1, crowd: 1 };
  }
  return { ...ACCRA_SETTING };
}

export function readSetting(value: unknown): StreetSetting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...ACCRA_SETTING };
  const row = value as Record<string, unknown>;
  const read = (key: keyof StreetSetting) => index(row[key], COUNTS[key]);
  return {
    stall: read("stall"),
    ride: read("ride"),
    passer: read("passer"),
    seller: read("seller"),
    shop: read("shop"),
    weather: read("weather"),
    posters: read("posters"),
    sound: read("sound"),
    place: read("place"),
    // A card saved before the crowd choice existed dresses its queue the way its posters read.
    crowd: row.crowd === undefined ? (read("posters") === 1 ? 1 : 0) : read("crowd"),
    queue: read("queue"),
    board: read("board"),
  };
}

function index(value: unknown, count: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < count ? value : 0;
}

/**
 * A card saved before the place choice existed takes it from its pitch, so "Beach bar at Labadi" is not drawn
 * as a brick street. Only the plain words are read; anything else stays the street.
 */
export function placeFromPitch(pitch: string): number {
  const words: [Place, RegExp][] = [
    ["beach", /\b(beach|shore|seaside|sand)\b/i],
    ["rooftop", /\b(rooftop|roof|terrace)\b/i],
    ["basement", /\b(basement|cellar|underground|downstairs)\b/i],
    ["garden", /\b(garden|courtyard|lawn|park)\b/i],
    ["warehouse", /\b(warehouse|factory|depot|loft)\b/i],
    ["harbour", /\b(harbou?r|dock|pier|marina|wharf|port)\b/i],
    ["lounge", /\b(lounge|hotel|lobby)\b/i],
  ];
  const found = words.find(([, pattern]) => pattern.test(pitch));
  return found ? PLACES.indexOf(found[0]) : 0;
}

export function streetPieces(setting: StreetSetting): StreetPieces {
  const safe = readSetting(setting);
  return {
    stall: STALLS[safe.stall].id,
    ride: RIDES[safe.ride].id,
    passer: PASSERS[safe.passer].id,
    seller: SELLERS[safe.seller].id,
    shop: SHOPS[safe.shop].id,
    weather: WEATHERS[safe.weather].id,
    posters: POSTERS[safe.posters].id,
    sound: SOUNDS[safe.sound].id,
    place: PLACES[safe.place] ?? "street",
    crowd: CROWDS[safe.crowd]?.id ?? "accra",
    queue: QUEUES[safe.queue].id,
    board: BOARDS[safe.board].id,
  };
}

/** True when every piece is left at its default: the door looks like every other default door. */
export function defaultStreet(setting: StreetSetting): boolean {
  const safe = readSetting(setting);
  return (Object.keys(ACCRA_SETTING) as (keyof StreetSetting)[]).every((key) => safe[key] === ACCRA_SETTING[key]);
}

export function shopCopy(setting: StreetSetting): { ad: [string, string, string]; kiosk: string; shutter: string; tone: string } {
  const shop = SHOPS[readSetting(setting).shop];
  return { ad: [...shop.ad], kiosk: shop.kiosk, shutter: shop.shutter, tone: shop.tone };
}

export function posterLines(setting: StreetSetting, sign: string): PosterSlips {
  const pack = POSTERS[readSetting(setting).posters];
  const top = posterSign(sign);
  return {
    purple: [...pack.purple],
    cream: [...pack.cream],
    flag: [...pack.flag],
    wall: pack.wall,
    sign: top.text,
    signSize: top.size,
  };
}

const QUIET: Learn = { title: "The street", text: "Nothing passing tonight. Just the queue and the music through the door." };

/** The little card for a painted piece. A mixed street explains the piece that is actually there. */
export function pieceLearn(setting: StreetSetting): Record<"food" | "vehicle" | "passer" | "kiosk" | "ad", Learn> {
  const safe = readSetting(setting);
  const shop = SHOPS[safe.shop];
  const passer = PASSERS[safe.passer] as { learn?: Learn };
  return {
    food: STALLS[safe.stall].learn,
    vehicle: RIDES[safe.ride].learn,
    passer: passer.learn ?? QUIET,
    kiosk: shop.kioskLearn,
    ad: shop.adLearn,
  };
}

export function soundCity(setting: StreetSetting): SoundId {
  return streetPieces(setting).sound;
}

function posterSign(sign: string): { text: string; size: number } {
  const text = sign.trim();
  const size = text.length > 20 ? 2 : text.length > 14 ? 2.5 : text.length > 11 ? 3.2 : 4.2;
  return { text, size };
}
