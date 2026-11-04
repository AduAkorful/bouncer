import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { HomeGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("A door", "A door run by a sponsor.");

export default function Page({ params }: { params: Promise<{ vault: string }> }) {
  return (
    <Suspense fallback={<NightShell door />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ vault: string }> }) {
  const { vault } = await params;
  return <HomeGate vaultId={decodeURIComponent(vault)} />;
}
