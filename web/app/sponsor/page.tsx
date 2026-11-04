import { screen } from "@/lib/screen";
import { Blocked } from "@/components/Blocked";
import { SponsorFlow } from "@/components/sponsor/SponsorFlow";
import { readPublicEnv } from "@/lib/config";
import { readApiBase } from "@/lib/api";
import { UNSET } from "@/lib/door";

export const metadata = screen("Run your own door", "Write a story, fund a pot, and let the guard run your door.");

export default function Page() {
  const labels = readPublicEnv(process.env);
  if (!labels.ok || !readApiBase(process.env.NEXT_PUBLIC_API_URL)) return <Blocked title="Sponsoring is not open." detail={UNSET} />;
  const keeper = process.env.NEXT_PUBLIC_KEEPER_ACCOUNT_ID?.trim() || null;
  return (
    <SponsorFlow
      rpcUrl={labels.env.rpcUrl}
      contractId={labels.env.contractId}
      networkId={labels.env.networkId}
      storageName={labels.env.storageName}
      keeperAccount={keeper}
    />
  );
}
