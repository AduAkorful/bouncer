import { DoorScene } from "@/components/DoorScene";
import { cardLook } from "@/lib/card";
import { CROWDS } from "@/lib/crowds";
import { ACCRA_SETTING, PLACE_LABELS, PLACES, SETTING_FIELDS, pieceDrawn } from "@/lib/street-setting";
import { baseSetting, doorSpec, frontId, makeCard, settingFrom } from "@/lib/demo/world";

/** One street at a time. Place, crowd, and each sponsor-menu piece come from the query. */
export function StreetFrame({ query }: { query: Record<string, string> }) {
  const spec = doorSpec(frontId())!;
  const setting = settingFrom(baseSetting(spec), query);
  const card = makeCard(spec, setting)!;
  const place = PLACES[setting.place] ?? "street";
  const crowd = CROWDS[setting.crowd];
  const pieces = SETTING_FIELDS.filter((field) => field.key !== "place" && field.key !== "crowd").map((field) => {
    const label = field.options[setting[field.key]] ?? "";
    return `${field.label}: ${label}${pieceDrawn(field.key, place) ? "" : " (not at this place)"}`;
  });
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 text-chalk">
      <DoorScene className="h-[70dvh] w-full" sign={card.sign} look={cardLook(card)} setting={setting} label={`${PLACE_LABELS[place]}, ${crowd?.label ?? "Accra"}`} />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Street</p>
        <h1 className="mt-1 font-sign text-2xl leading-none">{PLACE_LABELS[place]} · {crowd?.label ?? "Accra"}</h1>
        <p className="mt-3 text-sm text-chalk/70">{pieces.join(" · ")}</p>
      </div>
    </main>
  );
}
