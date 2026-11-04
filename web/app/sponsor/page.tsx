import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("Not open.", "A sponsor vault is created from the vault contract.");

export default function Page() {
  return <Quiet kicker="Sponsor" title="Not open." detail="A sponsor vault is created from the vault contract. This page does not invent a pot." />;
}
