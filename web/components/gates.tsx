import { Blocked } from "@/components/Blocked";
import { ClaimDoor } from "@/components/claim/ClaimDoor";
import { HomeDoor } from "@/components/home/HomeDoor";
import Raid from "@/components/play/Raid";
import { RevealDoor } from "@/components/reveal/RevealDoor";
import { httpRpc } from "@/lib/chain";
import { readPublicEnv } from "@/lib/config";
import { doorShut, UNSET } from "@/lib/door";
import { readPageVault, type PageVault } from "@/lib/page-vault";

/** Server gates. Each reads one vault from chain and shows what is true, or says why it cannot. */

type Labels = NonNullable<ReturnType<typeof publicLabels>>;
type Loaded = { ok: true; page: PageVault; labels: Labels } | { ok: false; detail: string };

function publicLabels() {
  const labels = readPublicEnv(process.env);
  return labels.ok ? labels.env : null;
}

async function load(vaultId?: string): Promise<Loaded> {
  const labels = publicLabels();
  if (!labels) return { ok: false, detail: UNSET };
  const page = await readPageVault(
    httpRpc(labels.rpcUrl),
    { contractId: labels.contractId, defaultVaultId: labels.vaultId, currency: labels.currency, decimals: labels.decimals, venue: labels.venue },
    vaultId,
  );
  if (!page.ok) {
    return { ok: false, detail: page.error === "missing vault" || page.error === "no story" || page.error === "id" ? "There is no door with that id." : "The vault view failed. Nothing on this door was filled in." };
  }
  return { ok: true, page: page.page, labels };
}

const basePath = (vaultId?: string) => (vaultId ? `/v/${vaultId}` : "");

export async function HomeGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return <HomeDoor vault={null} notice={loaded.detail === UNSET ? "The vault is not connected." : loaded.detail} />;
  const { page, labels } = loaded;
  return <HomeDoor vault={page.vault} card={page.card} base={basePath(vaultId)} currency={page.currency} decimals={page.decimals} networkTag={labels.networkTag} />;
}

export async function PlayGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return <Blocked title="The raid did not start." detail={loaded.detail} />;
  const { page, labels } = loaded;
  if (doorShut(page.vault, Date.now())) return <Blocked title="The queue is closed." detail="The door is shut." />;
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
    />
  );
}

export async function RevealGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return <Blocked title="The ledger stays shut." detail={loaded.detail} />;
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
    />
  );
}

export async function ClaimGate({ vaultId }: { vaultId?: string }) {
  const loaded = await load(vaultId);
  if (!loaded.ok) return <Blocked title="The claim is shut." detail={loaded.detail} />;
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
    />
  );
}
