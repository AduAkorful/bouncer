import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { PlayGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("The queue", "Six messages at the door.");

export default function Page({ params }: { params: Promise<{ vault: string }> }) {
  return (
    <Suspense fallback={<NightShell />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ vault: string }> }) {
  const { vault } = await params;
  return <PlayGate vaultId={decodeURIComponent(vault)} />;
}
