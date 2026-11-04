import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { ClaimDoor } from "@/components/claim/ClaimDoor";
import { NightShell } from "@/components/NightShell";
import { httpRpc, readDoor } from "@/lib/chain";
import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { UNSET } from "@/lib/door";

export const metadata = screen("Your cut", "The payout for a raid on this device.");

export default function ClaimPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <ClaimGate />
    </Suspense>
  );
}

async function ClaimGate() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) return <Blocked title="The claim is shut." detail={UNSET} />;
  const door = await readDoor(httpRpc(relay.env.rpcUrl), relay.env.contractId, relay.env.vaultId);
  if (!door.ok) return <Blocked title="The claim is shut." detail="The vault view failed." />;
  return (
    <ClaimDoor
      vaultId={relay.env.vaultId}
      currency={labels.env.currency}
      decimals={labels.env.decimals}
      storageName={labels.env.storageName}
      networkTag={labels.env.networkTag}
      round={door.vault.round}
      rpcUrl={labels.env.rpcUrl}
      contractId={labels.env.contractId}
      networkId={labels.env.networkId}
    />
  );
}
