import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No bouncer is stored.", "Instructions and the bench appear when a bouncer is on this account.", { index: false });

export default function Page() {
  return <Quiet kicker="Studio" title="No bouncer is stored." detail="Instructions and the bench appear when a bouncer is on this account." />;
}
