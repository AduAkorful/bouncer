import type { TokenRead } from "./page-vault.ts";
import { formatAtomic } from "./units.ts";

export const TOKEN_READING = "Reading the token.";
export const TOKEN_FAILED = "The token could not be read.";

export function tokenAmount(label: TokenRead | null, atomic: string) {
  if (!label) return { kind: "reading" as const };
  if (!label.ok) return { kind: "failed" as const };
  const text = formatAtomic(atomic, label.decimals);
  if (!text) return { kind: "failed" as const };
  return { kind: "ready" as const, text, symbol: label.symbol };
}
