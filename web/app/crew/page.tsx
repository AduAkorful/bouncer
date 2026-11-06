import { CrewCouncil } from "@/components/crew/CrewCouncil";
import { screen } from "@/lib/screen";

export const metadata = screen("No crew is stored.", "A crew is a DAO. None is connected to this device.", { index: false });

export default function Page() {
  return <CrewCouncil storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} rpcUrl={process.env.NEXT_PUBLIC_RPC_URL ?? ""} />;
}
