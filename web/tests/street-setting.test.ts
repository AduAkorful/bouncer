import assert from "node:assert/strict";
import test from "node:test";
import { CITIES } from "../lib/cities.ts";
import { buildCard, parseCard } from "../lib/card.ts";
import { ACCRA_SETTING, defaultStreet, pieceLearn, placeFromPitch, posterLines, readSetting, streetPieces } from "../lib/street-setting.ts";

const look = { build: 0, skin: 1, head: 0, outfit: 0, eyewear: 0 };

test("an old card with no setting is the Accra street", () => {
  const parsed = parseCard(JSON.stringify({ v: 1, sign: "THE VELVET", name: "Big Sam", pitch: "Come in.", look }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.card.setting, ACCRA_SETTING);
  const pieces = streetPieces(parsed.card.setting);
  assert.equal(pieces.stall, "suya");
  assert.equal(pieces.ride, "taxi");
  assert.equal(pieces.weather, "clear");
  assert.equal(posterLines(parsed.card.setting, parsed.card.sign).sign, "THE VELVET");
  assert.equal(posterLines(parsed.card.setting, "").sign, "");
  assert.equal(posterLines(parsed.card.setting, "velvet-1").sign, "velvet-1");
  assert.equal(posterLines(parsed.card.setting, parsed.card.sign).cream[2], "K-NOVA");
});

test("a bad setting falls back to Accra, and a stored 1 is kept", () => {
  assert.deepEqual(readSetting(null), ACCRA_SETTING);
  assert.deepEqual(readSetting({ stall: 9, ride: "cab", weather: 1, posters: 1.5 }), {
    ...ACCRA_SETTING,
    weather: 1,
  });
});

test("the second choice on every piece is the London street, and the cream poster uses the door sign", () => {
  const setting = { stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, weather: 1, posters: 1, sound: 1, place: 0, crowd: 1 };
  const pieces = streetPieces(setting);
  assert.deepEqual(pieces, {
    stall: "kebab",
    ride: "cab",
    passer: "bus",
    seller: "roses",
    shop: "cafe",
    weather: "rain",
    posters: "london",
    sound: "london",
    place: "street",
    crowd: "london",
  });
  const slips = posterLines(setting, "COASTLINE NIGHT");
  assert.equal(slips.sign, "COASTLINE NIGHT");
  assert.deepEqual(slips.purple, ["NIGHT", "BUS", "SATURDAY"]);
  assert.deepEqual(slips.flag, ["LAST", "TUBE"]);
  assert.equal(slips.cream.includes("K-NOVA"), false);
});

test("a mixed street explains the piece that is drawn", () => {
  const setting = { ...ACCRA_SETTING, weather: 1 };
  const pieces = streetPieces(setting);
  assert.equal(pieces.stall, "suya");
  assert.equal(pieces.weather, "rain");
  assert.equal(pieceLearn(setting).food.title, "Suya");
  assert.equal(pieceLearn(setting).food.text, CITIES.accra.learn.food.text);
  assert.equal(pieceLearn({ ...ACCRA_SETTING, stall: 1, shop: 0 }).food.text, CITIES.london.learn.food.text);
  assert.equal(pieceLearn({ ...ACCRA_SETTING, shop: 0 }).kiosk.text, CITIES.accra.learn.kiosk.text);
});

test("a full card with a setting still fits the card limit", () => {
  const built = buildCard(
    {
      sign: "A".repeat(24),
      name: "B".repeat(24),
      pitch: "C".repeat(160),
      look: { build: 1, skin: 2, head: 3, outfit: 1, eyewear: 2 },
      setting: { stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, weather: 1, posters: 1, sound: 1, place: 0, crowd: 1 },
    },
    600,
  );
  assert.equal(built.ok, true);
});

test("place and crowd: an old card follows its pitch and its posters, a bad index stays the street", () => {
  assert.equal(placeFromPitch("Beach bar at Labadi"), 1);
  assert.equal(placeFromPitch("Rooftop on Oxford Street"), 2);
  assert.equal(placeFromPitch("Basement bar off Old Compton Street"), 3);
  assert.equal(placeFromPitch("Crew night at the Coastline."), 0);
  assert.equal(readSetting({ posters: 1 }).crowd, 1);
  assert.equal(readSetting({ posters: 1, crowd: 0 }).crowd, 0);
  assert.equal(readSetting({ place: 9 }).place, 0);
  assert.equal(defaultStreet(readSetting({})), true);
  assert.equal(defaultStreet(readSetting({ place: 2 })), false);
});
