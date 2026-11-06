/** Player copy for a vault page that could not be filled. No sample door is invented. */

const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;
const ABSENT = new Set(["id", "missing vault", "no story"]);
const DETAIL = "Nothing on this door was filled in.";

export type UnreadDoor = {
  label: string | null;
  title: string;
  detail: string;
  retry: boolean;
};

export function unreadDoor(error: string, vaultId?: string): UnreadDoor {
  const label = vaultId && SAFE_ID.test(vaultId) ? vaultId : null;
  if (error === "unset") return { label, title: "This door is not connected.", detail: DETAIL, retry: false };
  if (ABSENT.has(error)) return { label, title: "There is no door with that id.", detail: DETAIL, retry: false };
  return { label, title: "This door could not be read.", detail: DETAIL, retry: true };
}

export function isVaultId(vaultId: string): boolean {
  return SAFE_ID.test(vaultId);
}

export function doorPaths(vaultId?: string): { door: string; play: string; reveal: string; claim: string } {
  if (vaultId && isVaultId(vaultId)) {
    const base = `/v/${encodeURIComponent(vaultId)}`;
    return { door: base, play: `${base}/play`, reveal: `${base}/reveal`, claim: `${base}/claim` };
  }
  return { door: "/home", play: "/play", reveal: "/reveal", claim: "/claim" };
}
