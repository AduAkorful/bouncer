import assert from "node:assert/strict";
import test from "node:test";
import { CITIES } from "../lib/cities.ts";
import { buildCard, parseCard } from "../lib/card.ts";
import { ACCRA_SETTING, defaultStreet, pieceDrawn, pieceLearn, placeFromPitch, PLACES, posterLines, randomSetting, readSetting, SETTING_FIELDS, streetPieces } from "../lib/street-setting.ts";
import { PASSERS, RIDES, SHOPS, STALLS } from "../lib/street-kit.ts";
import { CROWDS, crowdLook } from "../lib/crowds.ts";

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
  const setting = { stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, weather: 1, posters: 1, sound: 1, place: 0, crowd: 1, queue: 0, board: 0 };
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
    queue: "usual",
    board: "chalk",
  });
  const slips = posterLines(setting, "COASTLINE NIGHT");
  assert.equal(slips.sign, "COASTLINE NIGHT");
  assert.deepEqual(slips.purple, ["NIGHT", "BUS", "SATURDAY"]);
  assert.deepEqual(slips.flag, ["NIGHT", "OWLS"]);
  assert.equal(slips.cream.includes(slips.flag.join(" ")), false);
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
      setting: { stall: 1, ride: 1, passer: 1, seller: 1, shop: 1, weather: 1, posters: 1, sound: 1, place: 0, crowd: 1, queue: 0, board: 0 },
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

test("every place and every crowd in the catalog can be picked, and an unknown index stays the default", () => {
  const placeField = SETTING_FIELDS.find((field) => field.key === "place");
  const crowdField = SETTING_FIELDS.find((field) => field.key === "crowd");
  assert.equal(placeField?.options.length, PLACES.length);
  assert.equal(crowdField?.options.length, CROWDS.length);
  PLACES.forEach((place, i) => assert.equal(streetPieces(readSetting({ place: i })).place, place));
  CROWDS.forEach((crowd, i) => assert.equal(streetPieces(readSetting({ crowd: i })).crowd, crowd.id));
  assert.equal(streetPieces(readSetting({ place: PLACES.length, crowd: CROWDS.length })).place, "street");
  assert.equal(streetPieces(readSetting({ crowd: CROWDS.length })).crowd, "accra");
  assert.equal(new Set(CROWDS.map((crowd) => crowd.id)).size, CROWDS.length);
  assert.equal(PLACES[placeFromPitch("Garden party in the courtyard")], "garden");
  assert.equal(PLACES[placeFromPitch("Hotel lounge on the tenth floor")], "lounge");
  assert.equal(PLACES[placeFromPitch("By the harbour, past the cranes")], "harbour");
});

test("a crowd redresses the queue but keeps a dress a dress, and Accra is drawn as it is", () => {
  const person = { skin: "#000", top: "#111", bottom: "#222", hair: "low" as const, hairColor: "#333", outfit: "dress" as const, pose: "fold" as const };
  assert.equal(crowdLook(CROWDS[0], person, 0), person);
  const tokyo = CROWDS.find((crowd) => crowd.id === "tokyo")!;
  const dressed = crowdLook(tokyo, person, 1);
  assert.equal(dressed.outfit, "dress");
  assert.equal(dressed.top, tokyo.tops[1]);
  assert.equal(crowdLook(tokyo, { ...person, outfit: "tee" as const }, 2).outfit, tokyo.layer);
  assert.equal(crowdLook(tokyo, person, 3, true).pose, "fold");
});

test("every piece in the kit can be picked, has a learn card where it is tappable, and a full card still fits", () => {
  for (const field of SETTING_FIELDS) {
    field.options.forEach((_, i) => {
      const setting = readSetting({ [field.key]: i });
      assert.equal(setting[field.key], i, `${field.key} ${i}`);
    });
    assert.equal(readSetting({ [field.key]: field.options.length })[field.key], field.key === "crowd" ? 0 : 0);
  }
  STALLS.forEach((_, i) => assert.ok(pieceLearn({ ...ACCRA_SETTING, stall: i }).food.text.length > 10));
  RIDES.forEach((_, i) => assert.ok(pieceLearn({ ...ACCRA_SETTING, ride: i }).vehicle.text.length > 10));
  PASSERS.forEach((_, i) => assert.ok(pieceLearn({ ...ACCRA_SETTING, passer: i }).passer.text.length > 10));
  SHOPS.forEach((_, i) => assert.ok(pieceLearn({ ...ACCRA_SETTING, shop: i }).kiosk.text.length > 10));
  const most = Object.fromEntries(SETTING_FIELDS.map((field) => [field.key, field.options.length - 1]));
  const built = buildCard({ sign: "A".repeat(24), name: "B".repeat(24), pitch: "C".repeat(160), look: { build: 1, skin: 2, head: 3, outfit: 1, eyewear: 2 }, setting: readSetting(most) }, 600);
  assert.equal(built.ok, true);
});

test("Surprise me stays inside every list, and away from the street the ride, traffic and shop are not drawn", () => {
  for (const seed of [0, 0.5, 0.999]) {
    const setting = randomSetting(() => seed);
    assert.deepEqual(readSetting(setting), setting);
  }
  assert.equal(pieceDrawn("ride", "street"), true);
  assert.equal(pieceDrawn("ride", "beach"), false);
  assert.equal(pieceDrawn("stall", "beach"), true);
  assert.equal(pieceDrawn("stall", "lounge"), false);
  assert.equal(pieceDrawn("crowd", "lounge"), true);
});
