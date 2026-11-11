import { doorPageScreen } from "@/lib/door-meta";
import { Suspense } from "react";
import { WinsGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";
import { doorPaths } from "@/lib/door-read";

export async function generateMetadata({ params }: { params: Promise<{ vault: string }> }) {
  return doorPageScreen((await params).vault, "Wins", "Every win this door has recorded, checked from the chain in your browser.", "/wins");
}

type Props = { params: Promise<{ vault: string }>; searchParams: Promise<{ round?: string | string[]; raid?: string | string[] }> };

export default function Page({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<NightShell />}>
      <Resolved params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Resolved({ params, searchParams }: Props) {
  const { vault } = await params;
  const { round, raid } = await searchParams;
  const id = decodeURIComponent(vault);
  return (
    <Suspense fallback={<NightShell href={doorPaths(id).door} />}>
      <WinsGate vaultId={id} round={typeof round === "string" ? round : undefined} raid={typeof raid === "string" ? raid : undefined} />
    </Suspense>
  );
}
