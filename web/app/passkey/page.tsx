import { Suspense } from "react";
import { Blocked } from "@/components/Blocked";
import { PasskeySheet } from "@/components/passkey/PasskeySheet";
import { readPublicEnv } from "@/lib/config";

export default function PasskeyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-night" />}>
      <PasskeyGate searchParams={searchParams} />
    </Suspense>
  );
}

async function PasskeyGate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return <Blocked title="The passkey is shut." detail={`Missing configuration: ${labels.missing.join(", ")}`} />;
  const query = await searchParams;
  const next = query.next === "claim" ? "claim" : "profile";
  return (
    <PasskeySheet
      networkId={labels.env.networkId}
      rpcUrl={labels.env.rpcUrl}
      authContractId={labels.env.authContractId}
      mpcContractId={labels.env.mpcContractId}
      authClientId={labels.env.authClientId}
      next={next}
    />
  );
}
