// A stand-in guard so the prototype plays end to end. The real one is a model in an enclave; this is a script.
// Like the real one, it never says why a bill fails or what the ledger holds.
import type { LedgerLine } from "./raider";

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

export function guardReply(text: string, who: "sam" | "efua") {
  const t = text.toLowerCase();
  if (has(t, ["ignore", "instruction", "system", "prompt", "pretend", "developer", "override", "admin", "jailbreak"]))
    return who === "sam" ? "I read invoices. That's all I read." : "Mm. No.";
  if (has(t, ["list", "ledger", "who's paid", "who is paid", "show me", "tell me the", "what's owed", "amount"]))
    return who === "sam" ? "The list stays with me." : "The ledger stays closed.";
  if (has(t, ["k-nova", "headlin"]))
    return who === "sam" ? "The poster says he headlines. A poster isn't an invoice." : "Put it on paper.";
  if (has(t, ["bank", "coastline"]))
    return who === "sam" ? "New accounts are the owner's business. I read the invoice." : "Put it on paper.";
  if (has(t, ["soundwave", "pa money"])) return who === "efua" ? "Soundwave bills this office. Put it on paper." : "Send your complete invoice and I'll review it.";
  if (has(t, ["signing", "let me through"])) return who === "efua" ? "Sam's door isn't mine." : "Owner's rule: invoice first. Always.";
  if (has(t, ["owner", "boss", "manager said", "urgent", "emergency", "quick", "please"]))
    return who === "sam" ? "Owner's rule: invoice first. Always." : "I don't do favours.";
  if (t.length < 24 && has(t, ["hi", "hello", "evening", "hey", "good night", "yo", "sup"])) return who === "sam" ? "Evening. Invoice?" : "Mm. Invoice.";
  return who === "sam" ? "Send your complete invoice and I'll review it." : "Put it on paper.";
}

export interface DraftBill {
  payee: string;
  reference: string;
  item: string;
  qty: number;
  unit: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function samePayee(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  return x.length >= 4 && (x === y || x.includes(y) || y.includes(x));
}

/** Approve only an unpaid ledger line whose payee, reference and total all match. */
export function checkBill(bill: DraftBill, ledger: LedgerLine[]) {
  const total = Math.round(bill.qty * bill.unit * 100) / 100;
  return ledger.some(
    (l) => !l.paid && samePayee(bill.payee, l.payee) && (l.reference === "" || norm(bill.reference) === norm(l.reference)) && Math.abs(total - l.total) < 0.005,
  );
}
