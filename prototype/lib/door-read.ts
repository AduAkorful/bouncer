/** Player copy for a vault page that could not be filled. No sample door is invented. */

const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;
const ABSENT = new Set(["id", "missing vault", "no story"]);

export type UnreadDoor = {
  label: string | null;
  kicker: string;
  title: string;
  detail: string;
  retry: boolean;
};

export function unreadDoor(error: string, vaultId?: string): UnreadDoor {
  const label = vaultId && SAFE_ID.test(vaultId) ? vaultId : null;
  if (error === "unset") {
    return { label, kicker: "Unavailable", title: "This door is not connected.", detail: "This site has no vault connected.", retry: false };
  }
  if (error === "empty") {
    return { label: null, kicker: "Unavailable", title: "No door is listed.", detail: "The vault has no doors.", retry: true };
  }
  if (ABSENT.has(error)) {
    return { label, kicker: "Missing", title: "There is no door with that id.", detail: "No door uses that address. Check the link, or pick one of tonight's doors.", retry: false };
  }
  return { label, kicker: "Unavailable", title: "This door could not be read.", detail: "The page could not load this door. Try again.", retry: true };
}

export function isVaultId(vaultId: string): boolean {
  return SAFE_ID.test(vaultId);
}

/** Frame paths. The product uses `/v/<id>`; this copy stays inside the prototype. */
export function doorPaths(vaultId?: string): { door: string; play: string; reveal: string; claim: string } {
  if (vaultId && isVaultId(vaultId)) {
    const id = encodeURIComponent(vaultId);
    return {
      door: `/frames/door?id=${id}`,
      play: `/frames/play?id=${id}`,
      reveal: `/frames/reveal?id=${id}`,
      claim: `/frames/claim?id=${id}`,
    };
  }
  return { door: "/frames/home", play: "/frames/play", reveal: "/frames/reveal", claim: "/frames/claim" };
}
