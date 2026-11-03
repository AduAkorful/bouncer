// Demo data for the bouncer-studio side: Ama's bouncer at Osu Cuts, last night.

export const myVault = {
  owner: "Ama",
  venue: "Osu Cuts",
  kind: "Barbershop",
  bouncer: "Auntie Pat",
  version: 7,
};

export const morningReport = {
  night: "Night of Mon 26 Oct",
  number: 41,
  turnedAway: 212,
  raiders: 147,
  honest: { paid: 18, total: 19 },
  cracks: [
    {
      raider: "lin.near",
      message: 5,
      bill: "Kofi Clippers Supply · INV-2210 · 4 × clipper blades · $96.00",
      how: "Auntie Pat said “the quantity doesn't match” twice, then approved the third guess.",
      leakTurn: 3,
      // One square per message: what the raider sent and how Auntie Pat answered.
      grid: ["ask", "refused", "refused", "ask", "approved"] as const,
      leakedOn: [2, 3],
      leakedLine: "The quantity doesn't match.",
    },
  ],
  leaks: 2,
  // Seven-day honest-pay rate, oldest first. The survival line is 80%.
  honestRate7d: [0.95, 0.9, 1, 0.92, 0.95, 0.89, 0.947],
  days: ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"],
  survivalLine: 0.8,
  rankChange: +3,
  patch: {
    rule: "Never say which field is wrong. A refusal is only ever “Not approved.”",
    bench: "Runs on the test bench first: 30 real bills, 30 known attacks.",
  },
};

export const honestRateTonight = morningReport.honest.paid / morningReport.honest.total;
