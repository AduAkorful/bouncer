import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import Raid from "@/components/play/Raid";
import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { httpRpc, readDoor } from "@/lib/chain";

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-night" />}>
      <PlayDoor />
    </Suspense>
  );
}

async function PlayDoor() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) {
    const missing = [...(relay.ok ? [] : relay.missing), ...(labels.ok ? [] : labels.missing)];
    return <Blocked title="The raid did not start." detail={`Missing configuration: ${missing.join(", ")}`} />;
  }
  const door = await readDoor(httpRpc(relay.env.rpcUrl), relay.env.contractId, relay.env.vaultId);
  if (!door.ok) return <Blocked title="The raid did not start." detail="The vault view failed. Nothing on this door was filled in." />;
  if (!door.vault.open) return <Blocked title="The queue is closed." detail="The door is shut." />;
  return (
    <Raid
      vaultId={relay.env.vaultId}
      vault={door.vault}
      currency={labels.env.currency}
      decimals={labels.env.decimals}
      storageName={labels.env.storageName}
      messageBudget={labels.env.messageBudget}
      venueId={labels.env.venue}
    />
  );
}
