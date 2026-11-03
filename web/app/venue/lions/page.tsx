"use client";

import { VenueDoor } from "@/components/VenueRaid";
import { COACH } from "@/lib/look";

export default function LionsDoor() {
  return <VenueDoor sign="ACCRA LIONS" name="Accra Lions FC" kind="Club treasurer" look={COACH} />;
}
