import { Suspense } from "react";
import { connection } from "next/server";
import { Blocked } from "@/components/Blocked";
import { ClaimDoor } from "@/components/claim/ClaimDoor";
import { DoorList, DoorListPending } from "@/components/DoorList";
import { DoorUnread } from "@/components/DoorUnread";
import { HomeDoor } from "@/components/home/HomeDoor";
import Raid from "@/components/play/Raid";
import { RevealDoor } from "@/components/reveal/RevealDoor";
import { httpRpc, PAGE_READ_MS } from "@/lib/chain";
import { readPublicEnv } from "@/lib/config";
import { CLOSED_QUEUE, doorShut } from "@/lib/door";
import { doorPaths, unreadDoor, type UnreadDoor } from "@/lib/door-read";
import { frontDoor, readDoorIndex } from "@/lib/door-index";
import { readPageVault, type PageVault } from "@/lib/page-vault";

/** Server gates. Each reads one vault from chain and shows what is true, or says why it cannot. */

type Labels = NonNullable<ReturnType<typeof publicLabels>>;
type Loaded = { ok: true; page: PageVault; labels: Labels } | { ok: false; failure: UnreadDoor };
type Surface = "door" | "play" | "reveal" | "claim";

function publicLabels() {
  const labels = readPublicEnv(process.env);
  return labels.ok ? labels.env : null;
}

async function load(vaultId?: string): Promise<Loaded> {
  await connection();
  const labels = publicLabels();
  if (!labels) return { ok: false, failure: unreadDoor("unset", vaultId) };
  const rpc = httpRpc(labels.rpcUrl, fetch, { signal: AbortSignal.timeout(PAGE_READ_MS) });
  let id = vaultId;
  if (!id) {
    const picked = await plainDoor(rpc, labels.contractId);
    if (!picked.ok) return { ok: false, failure: picked.failure };
    id = picked.id;
  }
  const page = await readPageVault(
    rpc,
    { contractId: labels.contractId },
    id,
  );
  if (!page.ok) return { ok: false, failure: unreadDoor(page.error, id) };
  return { ok: true, page: page.page, labels };
}

/** A URL with no vault id follows the chain. An open door is chosen ahead of a closed one. */
async function plainDoor(rpc: ReturnType<typeof httpRpc>, contractId: string): Promise<{ ok: true; id: string } | { ok: false; failure: UnreadDoor }> {
  const index = await readDoorIndex(rpc, contractId, Date.now());
  if (!index.ok) return { ok: false, failure: unreadDoor("vault") };
  const picked = frontDoor(index.doors);
  if (!picked) return { ok: false, failure: unreadDoor(index.doors.length ? "vault" : "empty") };
  return { ok: true, id: picked.id };
}

function unread(surface: Surface, vaultId: string | undefined, failure: UnreadDoor) {
  const paths = doorPaths(vaultId);
  const backHref = surface === "door" ? (vaultId ? "/home" : null) : paths.door;
  const backLabel = "The door";
  return <DoorUnread {...failure} retryHref={failure.retry ? paths[surface] : null} backHref={backHref} backLabel={backLabel} />;
}

export async function HomeGate({ vaultId }: { vaultId?: string }) {
  await connection();
  const labels = publicLabels();
  if (!labels) return unread("door", vaultId, unreadDoor("unset", vaultId));
  const rpc = httpRpc(labels.rpcUrl, fetch, { signal: AbortSignal.timeout(PAGE_READ_MS) });
  const env = { contractId: labels.contractId };
  const indexPromise = readDoorIndex(rpc, labels.contractId, Date.now());
  let id = vaultId;
  if (!id) {
    const index = await indexPromise;
    if (!index.ok) return unread("door", undefined, unreadDoor("vault"));
    const picked = frontDoor(index.doors);
    if (!picked) return unread("door", undefined, unreadDoor(index.doors.length ? "vault" : "empty"));
    id = picked.id;
  }
  const page = await readPageVault(rpc, env, id);
  if (!page.ok) return unread("door", id, unreadDoor(page.error, id));
  const retryHref = doorPaths(id).door;
  return (
    <HomeDoor
      vault={page.page.vault}
      vaultId={page.page.vaultId}
      card={page.page.card}
      base={doorPaths(id).door}
      networkTag={labels.networkTag}
      token={page.page.token}
      wallet={{ rpcUrl: labels.rpcUrl, contractId: labels.contractId, networkId: labels.networkId, storageName: labels.storageName }}
      doors={
        <Suspense fallback={<DoorListPending />}>
          <HomeIndex index={indexPromise} exclude={page.page.vaultId} retryHref={retryHref} />
        </Suspense>
      }
    />
  );
}

async function HomeIndex({
  index,
  exclude,
  retryHref,
}: {
  index: ReturnType<typeof readDoorIndex>;
  exclude: string;
  retryHref: string;
}) {
  const read = await index;
  const doors = read.ok ? read.doors.filter((door) => door.id !== exclude) : [];
  return (
    <DoorList
      title="Other doors"
      doors={doors}
      failed={!read.ok}
      truncated={read.ok && read.truncated}
      empty="No other door is listed."
      retryHref={retryHref}
    />
  );
}

export async function PlayGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("play", vaultId, loaded.failure);
  const { page, labels } = loaded;
  const paths = doorPaths(page.vaultId);
  if (doorShut(page.vault, Date.now())) return <Blocked kicker={CLOSED_QUEUE.kicker} title={CLOSED_QUEUE.title} detail={CLOSED_QUEUE.detail} href={paths.door} />;
  return (
    <Raid
      vaultId={page.vaultId}
      vault={page.vault}
      token={page.token}
      storageName={labels.storageName}
      messageBudget={labels.messageBudget}
      venueId={page.venueId}
      card={page.card}
      specCt={page.specCt}
      doorHref={paths.door}
      retryHref={paths.play}
    />
  );
}

export async function RevealGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("reveal", vaultId, loaded.failure);
  const { page, labels } = loaded;
  return (
    <RevealDoor
      vaultId={page.vaultId}
      vault={page.vault}
      token={page.token}
      storageName={labels.storageName}
      venueId={page.venueId}
      specCt={page.specCt}
      networkTag={labels.networkTag}
      shut={doorShut(page.vault, Date.now())}
      doorHref={doorPaths(page.vaultId).door}
      retryHref={doorPaths(page.vaultId).reveal}
    />
  );
}

export async function ClaimGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("claim", vaultId, loaded.failure);
  const { page, labels } = loaded;
  return (
    <ClaimDoor
      vaultId={page.vaultId}
      token={page.token}
      storageName={labels.storageName}
      networkTag={labels.networkTag}
      round={page.vault.round}
      rpcUrl={labels.rpcUrl}
      contractId={labels.contractId}
      networkId={labels.networkId}
      doorHref={doorPaths(page.vaultId).door}
      retryHref={doorPaths(page.vaultId).claim}
    />
  );
}
