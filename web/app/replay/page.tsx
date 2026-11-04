import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No replay is stored.", "A replay reads a recorded night.");

export default function Page() {
  return <Quiet kicker="Replay" title="No replay is stored." detail="A replay reads a recorded night. None is stored." />;
}
