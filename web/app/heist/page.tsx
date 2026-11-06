import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No heist is listed.", "Friday is a spectator night. Nothing is scheduled.", { index: false });

export default function Page() {
  return <Quiet kicker="Heist night" title="No heist is listed." detail="Friday is a spectator night. Nothing is scheduled from a vault." />;
}
