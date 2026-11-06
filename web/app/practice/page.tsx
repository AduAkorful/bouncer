import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("Practice is not open.", "No practice ledger is stored.");

export default function Page() {
  return <Quiet kicker="Practice" title="Practice is not open." detail="No practice ledger is stored. The door is the game." />;
}
