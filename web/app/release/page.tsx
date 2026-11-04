import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("Nothing is staged.", "A release follows a bouncer that has been staged.");

export default function Page() {
  return <Quiet kicker="Release" title="Nothing is staged." detail="A release follows a bouncer that has been staged. None is." />;
}
