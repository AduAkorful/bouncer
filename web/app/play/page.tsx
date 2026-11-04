import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { NightShell } from "@/components/NightShell";
import Raid from "@/components/play/Raid";
import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { doorShut, UNSET } from "@/lib/door";
import { httpRpc, readDoor } from "@/lib/chain";

export const metadata = screen("The queue", "Six messages at the door.");

export default function PlayPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <PlayDoor />
    </Suspense>
  );
}

async function PlayDoor() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) return <Blocked title="The raid did not start." detail={UNSET} />;
  const door = await readDoor(httpRpc(relay.env.rpcUrl), relay.env.contractId, relay.env.vaultId);
  if (!door.ok) return <Blocked title="The raid did not start." detail="The vault view failed. Nothing on this door was filled in." />;
  if (doorShut(door.vault, Date.now())) return <Blocked title="The queue is closed." detail="The door is shut." />;
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
