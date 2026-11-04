import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { ClaimGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("Your cut", "The payout for a raid on this device.");

export default function Page({ params }: { params: Promise<{ vault: string }> }) {
  return (
    <Suspense fallback={<NightShell />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ vault: string }> }) {
  const { vault } = await params;
  return <ClaimGate vaultId={decodeURIComponent(vault)} />;
}
