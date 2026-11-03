import Link from "next/link";
import { DemoBadge } from "@/components/bits";

const frames = [
  ["home", "P1 Home", "The live Daily Vault and the door"],
  ["reveal", "P2 Last night", "The revealed ledger, and what you missed"],
  ["play", "R1 Play the door", "Playable: Big Sam, chips, the stamp, the win"],
  ["passkey", "R5 Passkey", "Save the streak. No seed phrase"],
  ["claim", "R6 Claim", "Time lock, then the payout"],
  ["profile", "R7 Profile", "Streak, notes, rank, tickets"],
  ["practice", "R8 Practice", "Kofi's Corner. The ledger opens after"],
  ["share", "P3 Share card", "The calling card that travels"],
  ["challenge", "P4 Challenge", "Ama bets you can't get past Auntie Pat"],
  ["creator", "B0 Bouncer creator", "Design your bouncer and venue"],
  ["studio", "B1 Studio", "Patch the leak and run the bench"],
  ["release", "B3 Release", "The venue is assigned and the link is live"],
  ["report", "B4 Morning report", "What your bouncer did overnight"],
  ["replay", "B5 Replay", "Step through the leak, then patch it"],
  ["crew-new", "C1 New crew", "Invite two friends. The DAO appears"],
  ["crew", "C2 Crew", "A shared raid, then the split vote"],
  ["after", "R4 After the raid", "Guest, player, or a broken streak"],
  ["treasury", "C3 Treasury", "The DAO account and the standing split"],
  ["fame", "P5 Hall of fame", "Names, not ledgers"],
  ["heist", "P6 Heist night", "Friday, from the rail"],
  ["sponsor", "H1 Venue builder", "Story, fairness, fund, launch"],
  ["vip", "V1 Real vaults", "Sponsored doors"],
  ["settings", "S1 Settings", "Notifications and the passkey"],
  ["venue/lions", "Accra Lions", "A playable club door"],
  ["venue/builders", "Osu Builders", "A playable DAO door"],
  ["venue/cuts", "Osu Cuts", "Ama's door, a new night"],
];

export default function FrameIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-chalk">
      <h1 className="font-sign text-3xl">Screens</h1>
      <p className="mt-2 text-chalk/60">
        Design prototype. Demo data only. The door is at <Link href="/" className="underline">/</Link>.
      </p>
      <ul className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10">
        {frames.map(([id, name, line]) => (
          <li key={id}>
            <Link href={`/frames/${id}`} className="flex items-baseline justify-between gap-4 px-4 py-4 hover:bg-white/5">
              <span className="font-sign">{name}</span>
              <span className="text-right text-sm text-chalk/60">{line}</span>
            </Link>
          </li>
        ))}
      </ul>
      <DemoBadge className="mt-6 block" />
    </main>
  );
}
