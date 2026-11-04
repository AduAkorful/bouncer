import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No raid is stored.", "This page reads the raid that just finished.");

export default function Page() {
  return <Quiet kicker="After the raid" title="No raid is stored." detail="This page reads the raid that just finished. There isn't one." />;
}
