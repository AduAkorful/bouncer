import { Blocked } from "@/components/Blocked";
import { RevealDoor } from "@/components/reveal/RevealDoor";
import { httpRpc, readDoor } from "@/lib/chain";
import { readPublicEnv, readRelayEnv } from "@/lib/config";

export default async function RevealPage() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) {
    const missing = [...(relay.ok ? [] : relay.missing), ...(labels.ok ? [] : labels.missing)];
    return <Blocked title="The ledger stays shut." detail={`Missing configuration: ${missing.join(", ")}`} />;
  }
  const door = await readDoor(httpRpc(relay.env.rpcUrl), relay.env.contractId, relay.env.vaultId);
  if (!door.ok) return <Blocked title="The ledger stays shut." detail="The vault view failed." />;
  return (
    <RevealDoor
      vaultId={relay.env.vaultId}
      vault={door.vault}
      currency={labels.env.currency}
      decimals={labels.env.decimals}
      storageName={labels.env.storageName}
      venueId={labels.env.venue}
      networkTag={labels.env.networkTag}
    />
  );
}
