import { screen } from "@/lib/screen";
import { VenueDoor } from "@/components/VenueRaid";
import { YAW } from "@/lib/look";

export const metadata = screen("Osu Builders", "Osu Builders keeps its own door.");

export default function BuildersDoor() {
  return <VenueDoor sign="OSU BUILDERS" name="Osu Builders" kind="DAO treasury" look={YAW} />;
}
