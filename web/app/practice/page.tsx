import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("Practice.", "No practice ledger is stored.");

export default function Page() {
  return <Quiet kicker="Practice" title="Practice." detail="No practice ledger is stored." />;
}
