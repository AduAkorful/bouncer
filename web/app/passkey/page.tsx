import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { PasskeySheet } from "@/components/passkey/PasskeySheet";
import { readPublicEnv } from "@/lib/config";
import { UNSET } from "@/lib/door";

export const metadata = screen("Passkey", "A passkey kept on this device.");

export default function PasskeyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-night" />}>
      <PasskeyGate searchParams={searchParams} />
    </Suspense>
  );
}

async function PasskeyGate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return <Blocked title="The passkey is shut." detail={UNSET} />;
  const query = await searchParams;
  const next = query.next === "claim" ? "claim" : "profile";
  return (
    <PasskeySheet
      next={next}
      rpcUrl={labels.env.rpcUrl}
      networkId={labels.env.networkId}
      vaultId={labels.env.vaultId}
      storageName={labels.env.storageName}
    />
  );
}
