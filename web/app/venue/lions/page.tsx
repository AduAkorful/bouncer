import { screen } from "@/lib/screen";
import { VenueDoor } from "@/components/VenueRaid";
import { COACH } from "@/lib/look";

export const metadata = screen("Accra Lions FC", "Accra Lions FC keeps its own door.");

export default function LionsDoor() {
  return <VenueDoor sign="ACCRA LIONS" name="Accra Lions FC" kind="Club treasurer" look={COACH} />;
}
