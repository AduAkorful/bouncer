import { screen } from "@/lib/screen";
import { Blocked } from "@/components/Blocked";
import { CreateCrew } from "@/components/crew/CreateCrew";
import { readCrewEnv } from "@/lib/config";
import { UNSET } from "@/lib/door";

export const metadata = screen("Start a crew", "This screen prepares a crew and does not send it.");

export default function Page() {
  const crew = readCrewEnv(process.env);
  if (!crew.ok) return <Blocked title="The crew did not start." detail={UNSET} />;
  return <CreateCrew env={crew.env} />;
}
