import { screen } from "@/lib/screen";
import { VenueDoor } from "@/components/VenueRaid";
import { PAT } from "@/lib/look";

export const metadata = screen("Osu Cuts", "Osu Cuts keeps its own door.");

export default function CutsDoor() {
  return <VenueDoor sign="OSU CUTS" name="Osu Cuts" kind="A new night" look={PAT} />;
}
