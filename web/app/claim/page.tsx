import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { ClaimDoor } from "@/components/claim/ClaimDoor";
import { httpRpc, readDoor } from "@/lib/chain";
import { readPublicEnv, readRelayEnv } from "@/lib/config";

export default function ClaimPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-night" />}>
      <ClaimGate />
    </Suspense>
  );
}

async function ClaimGate() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) {
    const missing = [...(relay.ok ? [] : relay.missing), ...(labels.ok ? [] : labels.missing)];
    return <Blocked title="The claim is shut." detail={`Missing configuration: ${missing.join(", ")}`} />;
  }
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
      authClientId={labels.env.authClientId}
      authContractId={labels.env.authContractId}
      mpcContractId={labels.env.mpcContractId}
    />
  );
}
