import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { HomeDoor } from "@/components/home/HomeDoor";
import { NightShell } from "@/components/NightShell";
import { readPublicEnv, readRelayEnv } from "@/lib/config";
import { httpRpc, readDoor } from "@/lib/chain";

export const metadata = screen("The Velvet", "The door at The Velvet for this round.");

export default function HomePage() {
  return (
    <Suspense fallback={<NightShell door />}>
      <HomeFrame />
    </Suspense>
  );
}

async function HomeFrame() {
  const relay = readRelayEnv(process.env);
  const labels = readPublicEnv(process.env);
  if (!relay.ok || !labels.ok) {
    return <HomeDoor vault={null} notice="The vault is not connected." />;
  }
  const door = await readDoor(httpRpc(relay.env.rpcUrl), relay.env.contractId, relay.env.vaultId);
  if (!door.ok) return <HomeDoor vault={null} notice="The vault view failed. Nothing on this door was filled in." />;
  return <HomeDoor vault={door.vault} currency={labels.env.currency} decimals={labels.env.decimals} networkTag={labels.env.networkTag} />;
}
