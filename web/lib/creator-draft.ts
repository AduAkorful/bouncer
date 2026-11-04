import { HEAD_COLORS, NEONS, PARTS, SAM, SKINS, type Look, type Neon } from "./look.ts";
import type { CityId } from "./cities.ts";

export const CREATOR_STORAGE = "bouncer.creator.v1";
export type CreatorDraft = { version: 1; look: Look; sign: string; neon: Neon; city: CityId; sound: boolean };
export const DEFAULT_DRAFT: CreatorDraft = {
  version: 1,
  look: { ...SAM, name: "Kwame", catchphrase: "Not on my list, not tonight." },
  sign: "THE GATE", neon: "rope", city: "accra", sound: false,
};

/** Browser cosmetics only. No account, ledger, entitlement or verdict is stored here. */
export function parseCreatorDraft(raw: string): CreatorDraft {
  const draft = JSON.parse(raw);
  const look = draft?.look;
  if (draft?.version !== 1 || !look || typeof look !== "object" ||
    typeof look.name !== "string" || look.name.length > 18 ||
    typeof look.catchphrase !== "string" || look.catchphrase.length > 40 ||
    typeof draft.sign !== "string" || draft.sign.length > 14 ||
    !["accra", "london"].includes(draft.city) || typeof draft.sound !== "boolean" ||
    !NEONS.some((n) => n.value === draft.neon) ||
    !Number.isInteger(look.skin) || look.skin < 0 || look.skin >= SKINS.length ||
    !HEAD_COLORS.includes(look.headColor) || typeof look.earpiece !== "boolean" ||
    !Object.entries(PARTS).every(([key, options]) => options.some((o) => !o.locked && o.value === look[key]))) {
    throw new Error("Invalid creator draft");
  }
  return { version: 1, look: {
    name: look.name, catchphrase: look.catchphrase, build: look.build, skin: look.skin,
    head: look.head, headColor: look.headColor, eyewear: look.eyewear,
    outfit: look.outfit, extra: look.extra, earpiece: look.earpiece,
  }, sign: draft.sign, neon: draft.neon, city: draft.city, sound: draft.sound };
}
