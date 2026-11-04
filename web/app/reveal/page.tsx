import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { NightShell } from "@/components/NightShell";
import { RevealDoor } from "@/components/reveal/RevealDoor";
import { httpRpc, readDoor } from "@/lib/chain";
import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { doorShut, UNSET } from "@/lib/door";

export const metadata = screen("Last night's door", "The ledger from the round that closed.");

export default function RevealPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <RevealGate />
    </Suspense>
  );
}

async function RevealGate() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) return <Blocked title="The ledger stays shut." detail={UNSET} />;
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
      shut={doorShut(door.vault, Date.now())}
    />
  );
}
