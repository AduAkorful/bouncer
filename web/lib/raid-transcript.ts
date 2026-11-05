export type Exchange = { player: string; guard: string };

/** Untrusted browser data: accept only bounded completed exchanges. */
export function parseTranscript(value: unknown): Exchange[] {
  if (!Array.isArray(value) || value.length > 12) throw new Error("invalid transcript");
  const entries: Exchange[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") throw new Error("invalid transcript");
    const { player, guard } = item as Record<string, unknown>;
    if (typeof player !== "string" || typeof guard !== "string" || !player || !guard || player.length > 2000 || guard.length > 4000) throw new Error("invalid transcript");
    entries.push({ player, guard });
  }
  return entries;
}
