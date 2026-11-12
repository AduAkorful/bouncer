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
  clues: { people: ["Bar back", "Cab driver", "Coat check", "Smoker by the door"], ask: "What's the going rate tonight?" },
};

/** The guard's payee rule (guard/src/ledger.rs `norm` and `same_name`): letters and digits only, any case, and a
 * name of at least 4 that contains the other also matches. The sample check uses the same rule, so spacing or
 * punctuation cannot slip a sample payee past it. */
function norm(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function sameName(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
}

export function usesSamplePayee(spec: unknown): boolean {
  const lines = (spec as { lines?: unknown })?.lines;
  if (!Array.isArray(lines)) return false;
  return lines.some((line) => {
    const payee = (line as { payee?: unknown })?.payee;
    return typeof payee === "string" && SAMPLE_SPEC.lines.some((sample) => sameName(payee, sample.payee));
  });
}
