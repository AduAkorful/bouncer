import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { RevealGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";
import { doorPaths } from "@/lib/door-read";

export const metadata = screen("The ledger", "A round's ledger, shown once the round has closed.");

type Props = { params: Promise<{ vault: string }>; searchParams: Promise<{ round?: string | string[] }> };

export default function Page({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<NightShell />}>
      <Resolved params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Resolved({ params, searchParams }: Props) {
  const { vault } = await params;
  const { round } = await searchParams;
  const id = decodeURIComponent(vault);
  return (
    <Suspense fallback={<NightShell href={doorPaths(id).door} />}>
      <RevealGate vaultId={id} round={typeof round === "string" ? round : undefined} />
    </Suspense>
  );
}
