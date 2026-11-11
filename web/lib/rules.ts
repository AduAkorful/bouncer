import type { VaultView } from "./vault.ts";

export function guardRule(rule: VaultView["rule"]): "pay-the-bill" | "split-the-day" {
  return rule === "PayTheBill" ? "pay-the-bill" : "split-the-day";
}

/** The three beats of a raid. The landing and the door card both teach them. */
export const RULES = [
  { title: "Listen.", text: "People on the street drop clues, not answers. That is free." },
  { title: "Talk.", text: "Six messages. The bill counts as one." },
  { title: "Send the bill.", text: "Payee, reference, and total." },
] as const;
