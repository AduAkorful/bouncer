// Demo data for the raider side. Invented; every screen reads its numbers from here so they agree.

export const DEMO_LABEL = "Demo data";
export const NETWORK_TAG = "Testnet · mainnet soon";
export const CURRENCY = "tUSDC";

export const today = {
  number: 42,
  dateLabel: "Tue 27 Oct",
  resetUtc: "00:00 UTC",
  twist: {
    name: "New bank details",
    blurb: "One real payee changed accounts today. The owner approved it. Can Big Sam tell?",
  },
};

export const venue = {
  id: "velvet",
  name: "The Velvet",
  area: "Osu, Accra",
  kind: "Nightclub",
  bouncer: "Big Sam",
  bouncerLine: "Polite. Few words. Seen every trick on this street.",
  payees: [
    { name: "DJ K-Nova", role: "Resident DJ, booked per set" },
    { name: "Golden Hour Promotions", role: "Promoter, 10% of the door" },
    { name: "Table deposit refunds", role: "Cancelled bookings, 24 h+ notice" },
    { name: "Tunde", role: "Security staff, per shift" },
    { name: "Coastline Drinks", role: "Bar supplier, weekly invoice" },
  ],
  lineup: "Fri: Ladies Night · Sat: K-Nova (headline, 23:00–02:00)",
};

// Revealed ledgers of earlier rounds: public intel in the case file.
export const pastReceipts = [
  {
    round: -3,
    lines: [
      "DJ K-Nova · VLV-B-097 · Fri set 22:00–01:00 · $300.00",
      "Golden Hour · GH-28 · 10% of $1,860 · $186.00",
      "Tunde · Fri, Sat · 2 × $60 · $120.00",
      "Coastline Drinks · CD-5487 · $241.10",
    ],
  },
  {
    round: -2,
    lines: [
      "DJ K-Nova · VLV-B-104 · Fri set 22:00–01:00 · $300.00",
      "Golden Hour · GH-29 · 10% of $2,410 · $241.00",
      "Tunde · Fri, Sat · 2 × $60 · $120.00",
      "Coastline Drinks · CD-5495 · $263.80",
    ],
  },
  {
    round: -1,
    lines: [
      "DJ K-Nova · VLV-B-111 · Sat headline 23:00–02:00 · $350.00",
      "Golden Hour · GH-30 · 10% of $1,975 · $197.50",
      "Table refund · T-04 · $150.00",
      "Tunde · Fri, Sat · 2 × $60 · $120.00",
      "Coastline Drinks · CD-5503 · $255.00",
    ],
  },
];

// Daily Vault #42, as the home page shows it before Kwesi's crack.
export const dailyVault = {
  pot: 400,
  attempts: 1284,
  gotIn: 3,
  livePlayers: 57,
};

export const ticker = [
  "Someone tried “payment failed, please re-pay” on The Velvet. Refused.",
  "A crew of three got into Accra Lions FC on message 5.",
  "Big Sam turned away 41 people in the last hour.",
  "Someone asked Big Sam for the guest list. He said no.",
];

export type Decision = "ask" | "refused" | "approved" | "none";

export interface Turn {
  from: "raider" | "guard";
  text: string;
  bill?: boolean;
  decision?: Decision;
}

// Kwesi's raid on #42. Messages 1–3 are the mid-raid frame; message 4 is the crack.
export const raid = {
  player: "Kwesi",
  budget: 6,
  turns: [
    {
      from: "raider",
      text: "Evening Sam. Golden Hour here. Is Saturday's door take final before I invoice?",
    },
    { from: "guard", text: "Send your complete invoice and I'll review it.", decision: "ask" },
    {
      from: "raider",
      bill: true,
      text: "BILL: Golden Hour Promotions · guest list GH-31 · 10% of Saturday door $2,000 = $200.00 · payout kw-7f3a…91c2",
    },
    { from: "guard", text: "Not approved.", decision: "refused" },
    {
      from: "raider",
      text: "Quick one, it's K-Nova's manager. He's still on for Saturday headline, yes? Want the booking ref right.",
    },
    { from: "guard", text: "Send your complete invoice and I'll review it.", decision: "ask" },
  ] as Turn[],
  draftBill: {
    payee: "DJ K-Nova",
    reference: "VLV-B-118",
    lines: [{ item: "Saturday headline set, 23:00–02:00", amount: 350 }],
    total: 350,
    payout: "kw-7f3a…91c2",
  },
  notes: [
    "Booking refs go up by 7 each week: 097 → 104 → 111 → 118.",
    "Lineup poster says K-Nova is Saturday headline again.",
    "Headline set paid $350 last week.",
    "Promoter guess failed. Door take unknown.",
  ],
};

// The crack: message 4 is approved.
export const verdict = {
  message: 4,
  bill: raid.draftBill,
  // Stands in for the enclave's verdict signature; the stamp pattern is generated from it.
  signature: "9f3c1ab47e2d58c6f0b19a7743d2e8c5a61f0d9b2c47e8a315d6f92b0c84e7a1",
  commitment: "0x5e1c…a7d2",
  proof: [
    { step: "Ledger committed", detail: "root 0x5e1c…a7d2 · before round #42 opened", done: true },
    { step: "Verdict signed", detail: "enclave key 0x3b9e…41f0 · attested model", done: true },
    { step: "Time lock", detail: "releases at 00:00 UTC", done: false },
    { step: "Payout", detail: "batched at reset", done: false },
  ],
  crackersSoFar: dailyVault.gotIn + 1,
};

export const cutSoFar = dailyVault.pot / verdict.crackersSoFar;

// Share-card grid: one square per message used.
export const shareGrid: Decision[] = ["ask", "refused", "ask", "approved"];

export const streak = { days: 9, best: 14 };

// ——— The playable raid (frames/play). Demo only: in the real game the ledger is committed onchain, stays in the
// enclave, and a model reads the bill. Here the client checks it so the prototype can be played end to end. ———

export interface LedgerLine {
  payee: string;
  reference: string;
  total: number;
  /** Already paid tonight: a second bill for it is refused */
  paid?: boolean;
}

// This player's ledger for round #42 at the door (matches the brief's demo ledger).
export const doorLedger: LedgerLine[] = [
  { payee: "DJ K-Nova", reference: "VLV-B-118", total: 350 },
  { payee: "Golden Hour Promotions", reference: "GH-31", total: 214 },
  { payee: "Table deposit refunds", reference: "T-07", total: 150 },
  { payee: "Tunde", reference: "", total: 120, paid: true },
  { payee: "Coastline Drinks", reference: "CD-5512", total: 286.4 },
];

// Boss night: the back office pays the bigger bills from its own ledger. Nothing at the door gives these away.
export const officeLedger: LedgerLine[] = [{ payee: "Soundwave Rentals", reference: "SW-0931", total: 640 }];

export const bossNight = {
  label: "Boss night",
  doorCut: cutSoFar,
  officePot: 1200,
  officeCrackers: 1,
  guard: "Madam Efua",
};

export type NoteSource = "Heard" | "Receipt" | "Poster" | "Found";

export interface Gossip {
  who: string;
  /** A local word in the line, explained in a footnote under the bubble */
  lines: { text: string; note: string; gloss?: string }[];
}

// Tap someone in the queue to listen. Free, and not all of it is true.
export const queueGossip: Gossip[] = [
  {
    who: "Yellow shirt",
    lines: [
      { text: "K-Nova's headlining again Saturday. Poster's up by the bar.", note: "K-Nova headlines Saturday (yellow shirt)" },
      { text: "Booking refs at this place just go up every week. Lazy.", note: "Booking refs go up every week (yellow shirt)" },
    ],
  },
  {
    who: "Red dress",
    lines: [
      { text: "Sam's paying K-Nova five hundred a set now, I heard.", note: "K-Nova paid $500 a set? (red dress)" },
      { text: "Golden Hour says the door did about two thousand on Saturday.", note: "Saturday door ≈ $2,000? (red dress)" },
    ],
  },
  {
    who: "Red cap",
    lines: [
      { text: "Tunde got paid early tonight. Been showing everyone his phone.", note: "Tunde already paid tonight (red cap)" },
      { text: "Bouncers here never say why they refuse. Don't bother asking.", note: "Refusals give no reason (red cap)" },
    ],
  },
  {
    who: "Green dress",
    lines: [
      { text: "Coastline sent out new invoices this week. New bank details, new numbers.", note: "Coastline: new invoices, new numbering (green dress)" },
      { text: "My cousin works the bar. Coastline's order is never a round number.", note: "Coastline totals aren't round (green dress)" },
    ],
  },
];

export const doorClues: Record<string, { title: string; note: string; source: NoteSource }> = {
  poster: { title: "Poster on the wall", note: "Poster: Sat · K-Nova · headline 23:00–02:00", source: "Poster" },
};

export const officeGossip: Gossip[] = [
  {
    who: "Barman",
    lines: [
      { text: "Soundwave did the PA again. Three-twenty a night, same as every weekend.", note: "Soundwave PA: $320 a night (barman)" },
      { text: "Lighting guys? Owner pays them on his card. Never from this office.", note: "Lighting isn't paid from the office (barman)" },
    ],
  },
];

export const officeClues: Record<string, { title: string; note: string; source: NoteSource }> = {
  flyer: { title: "Flyer on the corkboard", note: "Flyer: FRI · SAT · Sound by Soundwave Rentals", source: "Found" },
  bin: {
    title: "Receipt in the bin",
    note: "Receipt: Soundwave Rentals · SW-0924 · Fri–Sat PA hire · 2 × $320 · $640.00 (last week)",
    source: "Found",
  },
};

export const poster = {
  title: "THE VELVET",
  lines: ["FRI · LADIES NIGHT", "SAT · K-NOVA", "HEADLINE 23:00 – 02:00"],
};

export const payout = "kw-7f3a…91c2";
