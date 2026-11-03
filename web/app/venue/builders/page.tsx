"use client";

import { VenueDoor } from "@/components/VenueRaid";
import { YAW } from "@/lib/look";

export default function BuildersDoor() {
  return <VenueDoor sign="OSU BUILDERS" name="Osu Builders" kind="DAO treasury" look={YAW} />;
}
