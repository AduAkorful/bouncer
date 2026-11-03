import { Blocked } from "@/components/Blocked";
import { CreateCrew } from "@/components/crew/CreateCrew";
import { readCrewEnv } from "@/lib/config";

export default function Page() {
  const crew = readCrewEnv(process.env);
  if (!crew.ok) return <Blocked title="The crew did not start." detail={`Missing configuration: ${crew.missing.join(", ")}`} />;
  return <CreateCrew env={crew.env} />;
}
