"use client";

import { VenueDoor } from "@/components/VenueRaid";
import { PAT } from "@/lib/look";

export default function CutsDoor() {
  return <VenueDoor sign="OSU CUTS" name="Osu Cuts" kind="A new night" look={PAT} />;
}
