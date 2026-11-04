import { screen } from "@/lib/screen";
import { Quiet } from "@/components/Quiet";

export const metadata = screen("No challenge is stored.", "A challenge link names a vault.");

export default function Page() {
  return <Quiet kicker="Challenge" title="No challenge is stored." detail="A challenge link names a vault. None is set here." />;
}
