import { SiteNav } from "@/components/SiteNav";
import { screen } from "@/lib/screen";
import { connection } from "next/server";
import { Suspense } from "react";
import { DoorList } from "@/components/DoorList";
import { DoorUnread } from "@/components/DoorUnread";
import { pageRpc } from "@/lib/page-rpc";
import { readPublicEnv } from "@/lib/config";
import { readDoorIndex } from "@/lib/door-index";
import { unreadDoor } from "@/lib/door-read";
import { readTokenLabel } from "@/lib/page-vault";

export const metadata = screen("Sponsored doors", "Doors a sponsor has funded. Players still have to get past the bouncer.");

export default function VipPage() {
  const labels = readPublicEnv(process.env);
  if (!labels.ok) {
    const failure = unreadDoor("unset");
    return <DoorUnread {...failure} retryHref={null} backHref="/home" />;
  }
  return (
    <main className="min-h-dvh overflow-x-clip bg-night pb-24 pt-8 text-chalk">
      <div className="px-4"><SiteNav /></div>
      <div className="mx-auto max-w-5xl px-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">VIP</p>
        <h1 className="mt-1 font-sign text-3xl leading-tight">Sponsored doors</h1>
        <p className="mt-2 text-sm text-chalk/65">A sponsor funds the pot. Players still have to get past the bouncer. The unpaid list stays off this page.</p>
      </div>
      <Suspense fallback={<p className="mx-auto mt-6 max-w-lg px-4 text-sm text-chalk/70">Reading the doors.</p>}>
        <VipDoors contractId={labels.env.contractId} rpcUrl={labels.env.rpcUrl} fallbackUrl={labels.env.rpcFallbackUrl} />
      </Suspense>
      <div className="mx-auto max-w-5xl px-4">
      </div>
    </main>
  );
}

async function VipDoors({ contractId, rpcUrl, fallbackUrl }: { contractId: string; rpcUrl: string; fallbackUrl: string | null }) {
  await connection();
  const rpc = pageRpc({ rpcUrl, rpcFallbackUrl: fallbackUrl });
  const index = await readDoorIndex(rpc, contractId, Date.now());
  const doors = index.ok ? index.doors.filter((door) => door.sponsored || !door.read) : [];
  return (
    <DoorList
      title="Doors on the list"
      doors={doors}
      token={readTokenLabel(rpc, contractId)}
      failed={!index.ok}
      truncated={index.ok && index.truncated}
      empty="No sponsored vault is listed."
      retryHref="/vip"
    />
  );
}
