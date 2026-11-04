import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No treasury is stored.", "The balance, the history, and the split are reads from the crew DAO.");

export default function Page() {
  return <Quiet kicker="Treasury" title="No treasury is stored." detail="The balance, the history, and the split are reads from the crew DAO." />;
}
