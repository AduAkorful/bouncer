import { screen } from "@/lib/screen";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DoorList } from "@/components/DoorList";
import { DoorUnread } from "@/components/DoorUnread";
import { httpRpc, PAGE_READ_MS } from "@/lib/chain";
import { readPublicEnv } from "@/lib/config";
import { readDoorIndex } from "@/lib/door-index";
import { unreadDoor } from "@/lib/door-read";

export const metadata = screen("Real vaults.", "Sponsored vaults. Players still have to get past the bouncer.");

export default function VipPage() {
  const labels = readPublicEnv(process.env);
  if (!labels.ok) {
    const failure = unreadDoor("unset");
    return <DoorUnread {...failure} retryHref={null} backHref="/home" />;
  }
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg px-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">VIP</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Real vaults.</h1>
        <p className="mt-2 text-sm text-chalk/65">A sponsor funds the pot. Players still have to get past the bouncer. The unpaid list stays off this page.</p>
      </div>
      <Suspense fallback={<p className="mx-auto mt-6 max-w-lg px-4 text-sm text-chalk/70">Reading the doors.</p>}>
        <VipDoors contractId={labels.env.contractId} rpcUrl={labels.env.rpcUrl} fallbackUrl={labels.env.rpcFallbackUrl} />
      </Suspense>
      <div className="mx-auto max-w-lg px-4">
        <Link href="/home" className="chalk-focus mt-6 inline-flex min-h-11 items-center text-sm text-chalk/80 underline decoration-white/20">
          The door
        </Link>
      </div>
    </main>
  );
}

async function VipDoors({ contractId, rpcUrl, fallbackUrl }: { contractId: string; rpcUrl: string; fallbackUrl: string | null }) {
  await connection();
  const index = await readDoorIndex(
    httpRpc(rpcUrl, fetch, { signal: AbortSignal.timeout(PAGE_READ_MS), fallbackUrl, keep: true }),
    contractId,
    Date.now(),
  );
  const doors = index.ok ? index.doors.filter((door) => door.sponsored || !door.read) : [];
  return (
    <DoorList
      title="Sponsored doors"
      doors={doors}
      failed={!index.ok}
      truncated={index.ok && index.truncated}
      empty="No sponsored vault is listed."
      retryHref="/vip"
    />
  );
}
