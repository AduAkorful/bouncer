import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No crew is stored.", "A crew is a DAO. None is connected to this device.");

export default function Page() {
  return <Quiet kicker="Crew" title="No crew is stored." detail="A crew is a DAO. None is connected to this device." />;
}
