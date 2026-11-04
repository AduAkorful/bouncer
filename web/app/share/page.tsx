import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("Nothing to share.", "A calling card appears after a raid this device has finished.");

export default function Page() {
  return <Quiet kicker="Share" title="Nothing to share." detail="A calling card appears after a raid this device has finished." />;
}
