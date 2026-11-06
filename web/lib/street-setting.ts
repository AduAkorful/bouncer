/** A door's street. Eight indexes, mixed freely. Missing or bad values stay the Accra street. */

import { CITIES, type CityId } from "./cities.ts";

export type StreetSetting = {
  stall: number;
  ride: number;
  passer: number;
  seller: number;
  shop: number;
  weather: number;
  posters: number;
  sound: number;
};

export const ACCRA_SETTING: StreetSetting = {
  stall: 0,
  ride: 0,
  passer: 0,
  seller: 0,
  shop: 0,
  weather: 0,
  posters: 0,
  sound: 0,
};

export const SETTING_FIELDS = [
  { key: "stall", label: "Stall", options: ["Suya stand", "Kebab van"] },
  { key: "ride", label: "Ride", options: ["Yellow taxi", "Black cab"] },
  { key: "passer", label: "Passer", options: ["Okada", "Night bus"] },
  { key: "seller", label: "Seller", options: ["Water seller", "Rose seller"] },
  { key: "shop", label: "Shop", options: ["Chop bar and MoMo kiosk", "Café and off licence"] },
  { key: "weather", label: "Weather", options: ["Clear", "Rain"] },
  { key: "posters", label: "Posters", options: ["Accra slips", "London slips"] },
  { key: "sound", label: "Sound", options: ["Accra bed", "London bed"] },
] as const satisfies readonly { key: keyof StreetSetting; label: string; options: readonly [string, string] }[];

/** The whole street, from the food stall through the shop and the taxi. */
export const STREET_VIEW = "-230 -40 900 320";

/** Phone play: the stall, the queue, the door, and the figure at the lamp, all in one view. */
export const PHONE_STREET = "-240 8 640 268";

const ACCRA_SLIPS = {
  purple: ["AFRO", "BEATS", "EVERY SAT"] as [string, string, string],
  cream: ["FRI · LADIES", "SAT", "K-NOVA", "23:00 – 02:00"] as [string, string, string, string],
  flag: ["LADIES", "NIGHT"] as [string, string],
  wall: "OSU 4 LIFE",
};

const LONDON_SLIPS = {
  purple: ["NIGHT", "BUS", "SATURDAY"] as [string, string, string],
  cream: ["LAST TUBE", "SAT", "NIGHT", "ALL NIGHT"] as [string, string, string, string],
  flag: ["LAST", "TUBE"] as [string, string],
  wall: "ALL NIGHT",
};

export type PosterSlips = {
  purple: [string, string, string];
  cream: [string, string, string, string];
  flag: [string, string];
  wall: string;
  sign: string;
  signSize: number;
};

export type StreetPieces = {
  stall: "suya" | "kebab";
  ride: "taxi" | "cab";
  passer: "okada" | "bus";
  seller: "water" | "roses";
  shop: "chop" | "cafe";
  weather: "clear" | "rain";
  posters: "accra" | "london";
  sound: "accra" | "london";
};

export function citySetting(city: CityId): StreetSetting {
  if (city === "london") {
    return { stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, weather: 1, posters: 1, sound: 1 };
  }
  return { ...ACCRA_SETTING };
}

export function readSetting(value: unknown): StreetSetting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...ACCRA_SETTING };
  const row = value as Record<string, unknown>;
  return {
    stall: bit(row.stall),
    ride: bit(row.ride),
    passer: bit(row.passer),
    seller: bit(row.seller),
    shop: bit(row.shop),
    weather: bit(row.weather),
    posters: bit(row.posters),
    sound: bit(row.sound),
  };
}

export function streetPieces(setting: StreetSetting): StreetPieces {
  const safe = readSetting(setting);
  return {
    stall: safe.stall === 1 ? "kebab" : "suya",
    ride: safe.ride === 1 ? "cab" : "taxi",
    passer: safe.passer === 1 ? "bus" : "okada",
    seller: safe.seller === 1 ? "roses" : "water",
    shop: safe.shop === 1 ? "cafe" : "chop",
    weather: safe.weather === 1 ? "rain" : "clear",
    posters: safe.posters === 1 ? "london" : "accra",
    sound: safe.sound === 1 ? "london" : "accra",
  };
}

export function shopCopy(setting: StreetSetting): { ad: [string, string, string]; kiosk: string; shutter: string } {
  const city = CITIES[streetPieces(setting).shop === "cafe" ? "london" : "accra"];
  return {
    ad: city.ad,
    kiosk: city.kiosk,
    shutter: streetPieces(setting).shop === "cafe" ? "CAFF" : "KOJO",
  };
}

export function posterLines(setting: StreetSetting, sign: string): PosterSlips {
  const pack = streetPieces(setting).posters === "london" ? LONDON_SLIPS : ACCRA_SLIPS;
  const top = posterSign(sign);
  return { ...pack, sign: top.text, signSize: top.size };
}

/** The little card for a painted piece. A mixed street explains the piece that is actually there. */
export function pieceLearn(setting: StreetSetting): Record<"food" | "vehicle" | "passer" | "kiosk" | "ad", { title: string; text: string }> {
  const pieces = streetPieces(setting);
  const food = CITIES[pieces.stall === "kebab" ? "london" : "accra"].learn.food;
  const vehicle = CITIES[pieces.ride === "cab" ? "london" : "accra"].learn.vehicle;
  const passer = CITIES[pieces.passer === "bus" ? "london" : "accra"].learn.passer;
  const shop = CITIES[pieces.shop === "cafe" ? "london" : "accra"].learn;
  return { food, vehicle, passer, kiosk: shop.kiosk, ad: shop.ad };
}

export function soundCity(setting: StreetSetting): "accra" | "london" {
  return streetPieces(setting).sound;
}

function posterSign(sign: string): { text: string; size: number } {
  const text = sign.trim();
  const size = text.length > 20 ? 2 : text.length > 14 ? 2.5 : text.length > 11 ? 3.2 : 4.2;
  return { text, size };
}

function bit(value: unknown): number {
  return value === 1 ? 1 : 0;
}
