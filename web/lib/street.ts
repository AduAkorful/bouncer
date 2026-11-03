import type { StoredStreet } from "./session-store.ts";

export function readStreet(value: unknown): StoredStreet | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.payees) || !Array.isArray(record.poster) || !Array.isArray(record.queue)) return null;
  const payees = record.payees.filter((item): item is string => typeof item === "string" && item.length > 0);
  const poster = record.poster.filter((item): item is string => typeof item === "string" && item.length > 0);
  const queue = record.queue.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.who !== "string" || !Array.isArray(row.lines)) return [];
    const lines = row.lines.flatMap((line) => {
      if (!line || typeof line !== "object") return [];
      const heard = line as Record<string, unknown>;
      if (typeof heard.text !== "string" || typeof heard.note !== "string" || !heard.text || !heard.note) return [];
      return [{ text: heard.text, note: heard.note }];
    });
    if (!row.who || lines.length === 0) return [];
    return [{ who: row.who, lines }];
  });
  if (payees.length === 0 || queue.length === 0) return null;
  return { payees, poster, queue };
}
