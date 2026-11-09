import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { PasskeySheet } from "@/components/passkey/PasskeySheet";
import { readPublicEnv } from "@/lib/config";
import { UNSET } from "@/lib/door";
import { isVaultId } from "@/lib/door-read";

export const metadata = screen("Passkey", "A passkey kept on this device.");

export default function PasskeyPage({ searchParams }: { searchParams: Promise<{ next?: string; door?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-night" />}>
      <PasskeyGate searchParams={searchParams} />
    </Suspense>
  );
}

async function PasskeyGate({ searchParams }: { searchParams: Promise<{ next?: string; door?: string }> }) {
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return <Blocked title="The passkey is shut." detail={UNSET} />;
  const query = await searchParams;
  const next = query.next === "claim" || query.next === "play" ? query.next : "profile";
  // The door the player came from, so Continue and Back return there instead of the front door.
  const door = typeof query.door === "string" && isVaultId(query.door) ? query.door : undefined;
  return (
    <PasskeySheet
      next={next}
      door={door}
      rpcUrl={labels.env.rpcUrl}
      networkId={labels.env.networkId}
      storageName={labels.env.storageName}
    />
  );
}
