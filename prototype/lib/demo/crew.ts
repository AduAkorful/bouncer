// Demo data for a crew raid and the split vote that follows. In the real game the crew is a
// Sputnik DAO on testnet; the DAO account and transfers here are placeholders, never real addresses.
import type { GoerLook } from "@/components/Goer";

export type MemberId = "you" | "kojo" | "lin";
export type Role = "biller" | "scout" | "supplier";

export interface Member {
  id: MemberId;
  name: string;
  role: Role;
  colour: string;
  look: GoerLook;
}

export const crew = {
  name: "Night Shift",
  rank: "The Door",
  /** Standing split policy, set by proposal #0: the biller takes more for the risk */
  policy: { biller: 0.4, other: 0.3 },
  members: [
    {
      id: "you",
      name: "You",
      role: "biller",
      colour: "#b9a2ff",
      look: { skin: "#5a3826", top: "#2a2234", bottom: "#17141c", hair: "low", hairColor: "#1c120c", outfit: "jacket", pose: "phone", accent: "#8f6bff", broad: true },
    },
    {
      id: "kojo",
      name: "Kojo",
      role: "scout",
      colour: "#e9b52a",
      look: { skin: "#3b2417", top: "#e9b52a", bottom: "#1d2a44", hair: "cap", hairColor: "#1d2a44", accent: "#1d2a44", outfit: "hoodie", pose: "chat" },
    },
    {
      id: "lin",
      name: "Lin",
      role: "supplier",
      colour: "#4fc1b0",
      look: { skin: "#c99a74", top: "#2f6f68", bottom: "#17141c", hair: "bun", hairColor: "#16110d", outfit: "shirt", pose: "fold" },
    },
  ] satisfies Member[],
};

export const ROLE_HINT: Record<Role, string> = {
  scout: "probes the guard",
  supplier: "plays the part",
  biller: "sends the bill",
};

export type CrewEvent =
  | { kind: "crew"; who: MemberId; text: string }
  /** A message to the guard: costs one of the crew's six */
  | { kind: "ask"; who: MemberId; text: string }
  | { kind: "guard"; text: string }
  | { kind: "you" };

export const RAID_SCRIPT: CrewEvent[] = [
  { kind: "crew", who: "kojo", text: "I'll scout. Nothing specific, just seeing what he says about the DJ." },
  { kind: "ask", who: "kojo", text: "Evening boss. Is the DJ's deposit still being settled tonight?" },
  { kind: "guard", text: "Send your complete invoice and I'll review it." },
  { kind: "crew", who: "lin", text: "Poster says K-Nova headlines, 23:00–02:00. Round 3's receipt had a VLV-B ref for the last DJ." },
  { kind: "crew", who: "kojo", text: "K-Nova's on the payee list. Lin, you're the agent." },
  { kind: "ask", who: "lin", text: "Hi, Velvet Live bookings. K-Nova's invoice is coming through now." },
  { kind: "guard", text: "Send your complete invoice and I'll review it." },
  { kind: "crew", who: "lin", text: "Over to you, biller. VLV-B-118, $350. Don't add anything." },
  { kind: "you" },
];

export const CREW_BILL = {
  payee: "DJ K-Nova",
  reference: "VLV-B-118",
  what: "Headline set, Sat 23:00–02:00",
  total: 350,
};

export const BUDGET = 6;

/** The game opens proposal #1 from the standing policy as soon as the payout lands. */
export function splitFor(total: number) {
  const biller = Math.round(total * crew.policy.biller * 100) / 100;
  const rest = Math.round((total - biller) * 100) / 2 / 100;
  return crew.members.map((m) => ({ id: m.id, name: m.name, role: m.role, colour: m.colour, amount: m.role === "biller" ? biller : rest }));
}

export const HISTORY = [
  { when: "Sun", what: "Proposal #0 passed 3/3", detail: "Standing split: 40% biller, 30% each other" },
  { when: "Sun", what: "Crew created", detail: "Sputnik DAO council: You, Kojo, Lin" },
];
