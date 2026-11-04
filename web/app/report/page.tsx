import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No report is stored.", "The morning report reads the round that closed.");

export default function Page() {
  return <Quiet kicker="Morning report" title="No report is stored." detail="The morning report reads last night's vault. Nothing was read." />;
}
