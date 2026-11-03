import type { VaultView } from "./vault.ts";

export function guardRule(rule: VaultView["rule"]): "pay-the-bill" | "split-the-day" {
  return rule === "PayTheBill" ? "pay-the-bill" : "split-the-day";
}
