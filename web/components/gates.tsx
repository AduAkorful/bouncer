import { Suspense } from "react";
import { connection } from "next/server";
import { Blocked } from "@/components/Blocked";
import { ClaimDoor } from "@/components/claim/ClaimDoor";
import { DoorList, DoorListPending } from "@/components/DoorList";
import { DoorUnread } from "@/components/DoorUnread";
import { HomeDoor } from "@/components/home/HomeDoor";
import Raid from "@/components/play/Raid";
import { RevealDoor } from "@/components/reveal/RevealDoor";
import type { Rpc } from "@/lib/chain";
import { pageRpc } from "@/lib/page-rpc";
import { readPublicEnv } from "@/lib/config";
import { TonightRaid } from "@/components/home/TonightRaid";
import { CLOSED_QUEUE, doorFull, doorShut, doorTitle, FULL_QUEUE } from "@/lib/door";
import { doorPaths, unreadDoor, type UnreadDoor } from "@/lib/door-read";
import { doorCandidates, readDoorIndex } from "@/lib/door-index";
import type { TokenRead } from "@/lib/page-vault";
import { readPageVault, readTokenLabel, type PageVault } from "@/lib/page-vault";
import { LiveDoor } from "@/components/landing/LiveDoor";

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
  const rpc = pageRpc(labels);
  if (vaultId) {
    const page = await readPageVault(rpc, { contractId: labels.contractId }, vaultId);
    if (!page.ok) return { ok: false, failure: unreadDoor(page.error, vaultId) };
    return { ok: true, page: page.page, labels };
  }
  const picked = await plainDoor(rpc, labels.contractId);
  if (!picked.ok) return { ok: false, failure: picked.failure };
  const read = await firstReadable(rpc, labels.contractId, [picked.id, ...picked.others]);
  return read.ok ? { ok: true, page: read.page, labels } : { ok: false, failure: read.failure };
}

/** A URL with no vault id follows the chain. An open door is chosen ahead of a closed one. */
async function plainDoor(rpc: Rpc, contractId: string): Promise<{ ok: true; id: string; others: string[] } | { ok: false; failure: UnreadDoor }> {
  const index = await readDoorIndex(rpc, contractId, Date.now());
  if (!index.ok) return { ok: false, failure: unreadDoor("vault") };
  const candidates = doorCandidates(index.doors);
  if (!candidates.length) return { ok: false, failure: unreadDoor(index.doors.length ? "vault" : "empty") };
  return { ok: true, id: candidates[0].id, others: candidates.slice(1).map((door) => door.id) };
}

/**
 * A plain URL tries the next door when one read fails, up to three. If none reads, the failure names no door,
 * because the player did not ask for one.
 */
async function firstReadable(rpc: Rpc, contractId: string, ids: string[]): Promise<{ ok: true; page: PageVault } | { ok: false; failure: UnreadDoor }> {
  let error = "vault";
  for (const candidate of ids.slice(0, 3)) {
    const page = await readPageVault(rpc, { contractId }, candidate);
    if (page.ok) return { ok: true, page: page.page };
    error = page.error;
  }
  return { ok: false, failure: unreadDoor(error === "missing vault" ? "vault" : error) };
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
  const rpc = pageRpc(labels);
  const env = { contractId: labels.contractId };
  const indexPromise = readDoorIndex(rpc, labels.contractId, Date.now());
  let page: { ok: true; page: PageVault } | { ok: false; failure: UnreadDoor };
  if (vaultId) {
    const read = await readPageVault(rpc, env, vaultId);
    page = read.ok ? read : { ok: false, failure: unreadDoor(read.error, vaultId) };
  } else {
    const index = await indexPromise;
    if (!index.ok) return unread("door", undefined, unreadDoor("vault"));
    const candidates = doorCandidates(index.doors);
    if (!candidates.length) return unread("door", undefined, unreadDoor(index.doors.length ? "vault" : "empty"));
    // A plain /home falls back to the next door, and a failure here names none of them.
    page = await firstReadable(rpc, labels.contractId, candidates.map((door) => door.id));
  }
  if (!page.ok) return unread("door", vaultId, page.failure);
  const id = page.page.vaultId;
  // A plain /home retries /home, so the front door is chosen again.
  const retryHref = vaultId ? doorPaths(id).door : "/home";
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
          <HomeIndex index={indexPromise} exclude={page.page.vaultId} retryHref={retryHref} token={page.page.token} />
        </Suspense>
      }
    />
  );
}

async function HomeIndex({
  index,
  exclude,
  retryHref,
  token,
  narrow = false,
}: {
  index: ReturnType<typeof readDoorIndex>;
  exclude: string;
  retryHref: string;
  token: Promise<TokenRead>;
  narrow?: boolean;
}) {
  const read = await index;
  const doors = read.ok ? read.doors.filter((door) => door.id !== exclude) : [];
  const open = doors.filter((door) => !door.shut).length;
  return (
    <DoorList
      title={open ? `Other doors · ${open} open tonight` : "Other doors"}
      doors={doors}
      failed={!read.ok}
      truncated={read.ok && read.truncated}
      empty="No other door is listed."
      retryHref={retryHref}
      token={token}
      narrow={narrow}
    />
  );
}

export async function PlayGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("play", vaultId, loaded.failure);
  const { page, labels } = loaded;
  const paths = doorPaths(page.vaultId);
  const shutNow = doorShut(page.vault, Date.now());
  if (shutNow || doorFull(page.vault)) {
    // A shut or full door points at the doors that are open instead of ending on one card.
    const rpc = pageRpc(labels);
    const stop = shutNow ? CLOSED_QUEUE : FULL_QUEUE;
    return (
      <Blocked kicker={stop.kicker} title={stop.title} detail={stop.detail} href={paths.door} door={doorTitle(page.card, page.vaultId).sign}>
        {/* The winner who comes back to a taken door is told it was them, with the way to their cut. */}
        {labels.storageName ? <div className="mx-auto max-w-lg"><TonightRaid storageName={labels.storageName} vaultId={page.vaultId} round={page.vault.round} playHref={paths.play} /></div> : null}
        <Suspense fallback={<DoorListPending />}>
          <HomeIndex index={readDoorIndex(rpc, labels.contractId, Date.now())} exclude={page.vaultId} retryHref={paths.play} token={page.token} narrow />
        </Suspense>
      </Blocked>
    );
  }
  // Tonight's other open doors, biggest pot first, for the ending when the messages run out.
  const others = readDoorIndex(pageRpc(labels), labels.contractId, Date.now()).then((read) =>
    read.ok ? doorCandidates(read.doors).filter((door) => !door.shut && door.read && door.id !== page.vaultId).slice(0, 3) : [],
  );
  return (
    <Raid
      others={others}
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

export async function RevealGate({ vaultId, round }: { vaultId?: string; round?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("reveal", vaultId, loaded.failure);
  const { page, labels } = loaded;
  // A past round from the player's history; a later round than the vault's is not real.
  const asked = round && /^[1-9][0-9]{0,15}$/.test(round) && BigInt(round) <= BigInt(page.vault.round) ? round : undefined;
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
      retryHref={asked ? `${doorPaths(page.vaultId).reveal}?round=${asked}` : doorPaths(page.vaultId).reveal}
      round={asked}
    />
  );
}

export async function ClaimGate({ vaultId, round }: { vaultId?: string; round?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("claim", vaultId, loaded.failure);
  const { page, labels } = loaded;
  // A past round can be claimed from its own page. A later round than the vault's is not real.
  const claimRound = round && /^[1-9][0-9]{0,15}$/.test(round) && BigInt(round) <= BigInt(page.vault.round) ? round : page.vault.round;
  return (
    <ClaimDoor
      sign={doorTitle(page.card, page.vaultId).sign}
      guard={page.card?.name || null}
      vaultId={page.vaultId}
      token={page.token}
      storageName={labels.storageName}
      networkTag={labels.networkTag}
      round={claimRound}
      rpcUrl={labels.rpcUrl}
      contractId={labels.contractId}
      networkId={labels.networkId}
      doorHref={doorPaths(page.vaultId).door}
      retryHref={claimRound === page.vault.round ? doorPaths(page.vaultId).claim : `${doorPaths(page.vaultId).claim}?round=${claimRound}`}
    />
  );
}

/** The landing's live line: tonight's front door, its pot, and when it closes. Nothing is drawn if no door is open. */
export async function LandingLive() {
  await connection();
  const labels = publicLabels();
  if (!labels) return null;
  const rpc = pageRpc(labels);
  const index = await readDoorIndex(rpc, labels.contractId, Date.now());
  if (!index.ok) return null;
  const front = doorCandidates(index.doors).find((door) => !door.shut);
  if (!front || !front.dayPot || !front.closesAt) return null;
  return <LiveDoor sign={front.sign} href={front.href} dayPot={front.dayPot} closesAt={front.closesAt} token={readTokenLabel(rpc, labels.contractId)} />;
}
