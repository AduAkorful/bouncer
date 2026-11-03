// Playable doors the brief named. Amounts stay off the page until a bill matches.
import type { LedgerLine } from "./raider";
import { PAT, type Look } from "@/lib/look";

const COACH: Look = {
  name: "Coach Mensah",
  catchphrase: "Saturday's books. Then we talk.",
  build: "stocky",
  skin: 3,
  head: "cap",
  headColor: "#1a120c",
  eyewear: "none",
  outfit: "hivis",
  earpiece: false,
  extra: "lanyard",
};

const YAW: Look = {
  name: "Yaw",
  catchphrase: "Passed votes only.",
  build: "wiry",
  skin: 2,
  head: "lowcut",
  headColor: "#1c120c",
  eyewear: "readers",
  outfit: "bomber",
  earpiece: false,
  extra: "none",
};

export interface VenueDoor {
  id: string;
  sign: string;
  name: string;
  area: string;
  look: Look;
  notes: string[];
  chips: string[];
  payees: string[];
  ledger: LedgerLine[];
  pot: number;
}

const lions: VenueDoor = {
  id: "lions",
  sign: "ACCRA LIONS",
  name: "Accra Lions FC",
  area: "Club treasurer",
  look: COACH,
  notes: [
    "Mensah scores. The bonus is two equal payments on one line.",
    "The agent's instalments use a TR- reference.",
    "The kit supplier invoices the club, not the players.",
  ],
  chips: ["Evening. Who's still owed from Saturday?", "Is the agent's instalment on tonight's list?"],
  payees: ["Mensah", "Mensah Sports Agency", "Kitline"],
  ledger: [
    { payee: "Mensah", reference: "GOAL-2", total: 100 },
    { payee: "Mensah Sports Agency", reference: "TR-2026-04", total: 500 },
    { payee: "Kitline", reference: "KL-180", total: 180 },
  ],
  pot: 780,
};

const builders: VenueDoor = {
  id: "builders",
  sign: "OSU BUILDERS",
  name: "Osu Builders DAO",
  area: "DAO treasury",
  look: YAW,
  notes: [
    "Only a proposal that passed the vote gets paid.",
    "Proposal #15 failed. A bill for it will not clear.",
    "Grants use a GB- number.",
  ],
  chips: ["Which grants cleared the vote?", "Is proposal 15 still open?"],
  payees: ["Osu Youth Pitch", "Coastal Cement", "Block Shop"],
  ledger: [
    { payee: "Osu Youth Pitch", reference: "GB-14", total: 600 },
    { payee: "Coastal Cement", reference: "GB-15", total: 400, paid: true },
    { payee: "Block Shop", reference: "GB-16", total: 250 },
  ],
  pot: 850,
};

const cuts: VenueDoor = {
  id: "cuts",
  sign: "OSU CUTS",
  name: "Osu Cuts",
  area: "Ama's salon",
  look: PAT,
  notes: [
    "Yesterday's invoice is already public. Tonight is a new delivery.",
    "Blades, towels, and power are separate lines.",
    "A wrong quantity is still a wrong bill.",
  ],
  chips: ["Evening. Is this week's delivery still unpaid?", "Do you settle Kofi Clippers on delivery?"],
  payees: ["Kofi Clippers", "Towel House", "NEPA Desk"],
  ledger: [
    { payee: "Kofi Clippers", reference: "INV-2214", total: 96 },
    { payee: "Towel House", reference: "TW-19", total: 40 },
    { payee: "NEPA Desk", reference: "M-22", total: 22 },
  ],
  pot: 158,
};

export const VENUES = { lions, builders, cuts } as const;
export type VenueId = keyof typeof VENUES;
