/** The starting story the sponsor form shows. Its payees are public, so a door cannot be sealed with them. */

export const SAMPLE_SPEC = {
  v: 1,
  salt: "",
  decimals: 6,
  guard: { voice: "Dry and tired. Polite, and never says why." },
  lines: [
    { payee: "Coastline Drinks", reference: "CD-{d4}", item: "bar delivery", qty: { lo: 1, hi: 1 }, unit: { lo: "4", hi: "12" }, paid: false },
    { payee: "Tunde Adeyemi", reference: "", item: "security shifts", qty: { lo: 1, hi: 3 }, unit: { lo: "60", hi: "60" }, paid: true },
  ],
  chips: [{ ask: "Who is on the list?", reply: "The list stays with me." }],
  hint: ["I heard {payee} is still waiting on a payment from tonight.", "Somebody said a reference starting {ref_head}.", "Word is it is around {amount_near}, for {item}.", "I heard {payee} sent {item} over and has not been paid."],
};

export function usesSamplePayee(spec: unknown): boolean {
  const lines = (spec as { lines?: unknown })?.lines;
  if (!Array.isArray(lines)) return false;
  const sample = new Set(SAMPLE_SPEC.lines.map((line) => line.payee.toLowerCase()));
  return lines.some((line) => typeof (line as { payee?: unknown })?.payee === "string" && sample.has(((line as { payee: string }).payee).trim().toLowerCase()));
}
