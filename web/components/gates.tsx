import { Blocked } from "@/components/Blocked";
import { ClaimDoor } from "@/components/claim/ClaimDoor";
import { DoorUnread } from "@/components/DoorUnread";
import { HomeDoor } from "@/components/home/HomeDoor";
import Raid from "@/components/play/Raid";
import { RevealDoor } from "@/components/reveal/RevealDoor";
import { httpRpc, PAGE_READ_MS } from "@/lib/chain";
import { readPublicEnv } from "@/lib/config";
import { doorShut } from "@/lib/door";
import { doorPaths, unreadDoor, type UnreadDoor } from "@/lib/door-read";
import { readDoorIndex } from "@/lib/door-index";
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
  const labels = publicLabels();
  if (!labels) return { ok: false, failure: unreadDoor("unset", vaultId) };
  const page = await readPageVault(
    httpRpc(labels.rpcUrl, fetch, { signal: AbortSignal.timeout(PAGE_READ_MS) }),
    { contractId: labels.contractId, defaultVaultId: labels.vaultId, currency: labels.currency, decimals: labels.decimals, venue: labels.venue },
    vaultId,
  );
  if (!page.ok) return { ok: false, failure: unreadDoor(page.error, vaultId) };
  return { ok: true, page: page.page, labels };
}

function unread(surface: Surface, vaultId: string | undefined, failure: UnreadDoor) {
  const paths = doorPaths(vaultId);
  const backHref = surface === "door" ? (vaultId ? "/home" : null) : paths.door;
  return <DoorUnread {...failure} retryHref={failure.retry ? paths[surface] : null} backHref={backHref} />;
}

const basePath = (vaultId?: string) => (vaultId ? `/v/${vaultId}` : "");

export async function HomeGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("door", vaultId, loaded.failure);
  const { page, labels } = loaded;
  const index = await readDoorIndex(
    httpRpc(labels.rpcUrl, fetch, { signal: AbortSignal.timeout(PAGE_READ_MS) }),
    labels.contractId,
    labels.vaultId,
    Date.now(),
  );
  const doors = index.ok ? index.doors.filter((door) => door.id !== page.vaultId) : [];
  return (
    <HomeDoor
      vault={page.vault}
      card={page.card}
      base={basePath(vaultId)}
      currency={page.currency}
      decimals={page.decimals}
      networkTag={labels.networkTag}
      doors={doors}
      doorsFailed={!index.ok}
      doorsTruncated={index.ok && index.truncated}
      retryHref={doorPaths(vaultId).door}
    />
  );
}

export async function PlayGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return unread("play", vaultId, loaded.failure);
  const { page, labels } = loaded;
  if (doorShut(page.vault, Date.now())) return <Blocked title="The queue is closed." detail="The door is shut." href={doorPaths(vaultId).door} />;
  return (
    <Raid
      vaultId={page.vaultId}
      vault={page.vault}
      currency={page.currency}
      decimals={page.decimals}
      storageName={labels.storageName}
      messageBudget={labels.messageBudget}
      venueId={page.venueId}
      card={page.card}
      specCt={page.specCt}
      doorHref={doorPaths(vaultId).door}
      retryHref={doorPaths(vaultId).play}
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
      currency={page.currency}
      decimals={page.decimals}
      storageName={labels.storageName}
      venueId={page.venueId}
      specCt={page.specCt}
      networkTag={labels.networkTag}
      shut={doorShut(page.vault, Date.now())}
      doorHref={doorPaths(vaultId).door}
      retryHref={doorPaths(vaultId).reveal}
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
      currency={page.currency}
      decimals={page.decimals}
      storageName={labels.storageName}
      networkTag={labels.networkTag}
      round={page.vault.round}
      rpcUrl={labels.rpcUrl}
      contractId={labels.contractId}
      networkId={labels.networkId}
      doorHref={doorPaths(vaultId).door}
      retryHref={doorPaths(vaultId).claim}
    />
  );
}
