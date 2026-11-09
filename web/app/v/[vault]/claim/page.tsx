import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { ClaimGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";
import { doorPaths } from "@/lib/door-read";

export const metadata = screen("Your cut", "The payout for a raid on this device.");

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
      <ClaimGate vaultId={id} round={typeof round === "string" ? round : undefined} />
    </Suspense>
  );
}
