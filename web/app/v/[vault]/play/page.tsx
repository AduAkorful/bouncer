import { doorPageScreen } from "@/lib/door-meta";
import { Suspense } from "react";
import { PlayGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export async function generateMetadata({ params }: { params: Promise<{ vault: string }> }) {
  return doorPageScreen((await params).vault, "The queue", "Six messages at the door.", "/play");
}

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
