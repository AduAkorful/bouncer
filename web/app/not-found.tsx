import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("This page is not on this door.", "The address does not lead anywhere on this night.");

export default function NotFound() {
  return <Quiet kicker="Door" title="This page is not on this door." detail="The address does not lead anywhere on this night." />;
}
