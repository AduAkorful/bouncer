import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { RevealGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";
import { doorPaths } from "@/lib/door-read";

export const metadata = screen("Last night's door", "The ledger from the round that closed.");

export default function Page({ params }: { params: Promise<{ vault: string }> }) {
  return (
    <Suspense fallback={<NightShell />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ vault: string }> }) {
  const { vault } = await params;
  const id = decodeURIComponent(vault);
  return (
    <Suspense fallback={<NightShell href={doorPaths(id).door} />}>
      <RevealGate vaultId={id} />
    </Suspense>
  );
}
