/** Which first-raid tips this browser has seen (plan 80, §2.2). A browser that cannot store remembers for this page only. */
import { TIP_IDS, type TipId } from "./help.ts";

const KEY = "bouncer.tips.v1";
const SKIP = "skip";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memory = new Set<string>();

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(from: Store | null): Set<string> {
  const out = new Set(memory);
  try {
    const raw = from?.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list)) for (const item of list) if (typeof item === "string") out.add(item);
  } catch {
    // A broken or blocked entry reads as nothing seen beyond this page.
  }
  return out;
}

function write(from: Store | null, seen: Set<string>) {
  for (const item of seen) memory.add(item);
  try {
    from?.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // Kept in memory for this page.
  }
}

export function tipSeen(id: TipId, from: Store | null = store()): boolean {
  const seen = read(from);
  return seen.has(SKIP) || seen.has(id);
}

export function markTip(id: TipId, from: Store | null = store()) {
  const seen = read(from);
  seen.add(id);
  write(from, seen);
}

export function skipTips(from: Store | null = store()) {
  const seen = read(from);
  seen.add(SKIP);
  for (const id of TIP_IDS) seen.add(id);
  write(from, seen);
}

export function resetTips(from: Store | null = store()) {
  memory.clear();
  try {
    from?.removeItem(KEY);
  } catch {
    // Nothing stored to clear.
  }
}
