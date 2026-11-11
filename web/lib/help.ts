/**
 * The in-app help, as data, so the help sheet, the door card and /how-it-works say the same thing.
 * Each sentence describes what the code does today; the comment beside it names where (plan 80, §4).
 * If the code changes, change the sentence. Never put a real door's payee, reference or amount here.
 */

export type HelpValues = {
  /** Messages per raid, from the page's own budget. */
  budget?: number;
  /** This door's time lock in nanoseconds, from the vault view. */
  lockNs?: string;
};

export type HelpPanel = { id: string; title: string; lines: string[] };

const NS_PER_MINUTE = 60_000_000_000n;

/** A lock length in plain words, or null when it cannot be read. */
export function lockWords(lockNs: string | undefined): string | null {
  if (!lockNs || !/^\d+$/.test(lockNs)) return null;
  const minutes = Number(BigInt(lockNs) / NS_PER_MINUTE);
  if (!Number.isSafeInteger(minutes) || minutes < 1) return null;
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest ? `${h} ${rest} minute${rest === 1 ? "" : "s"}` : h;
}

function messages(budget: number | undefined): string {
  return budget && Number.isSafeInteger(budget) && budget > 0 ? `${budget} messages` : "a few messages";
}

export function helpPanels(values: HelpValues = {}): HelpPanel[] {
  const lock = lockWords(values.lockNs);
  return [
    {
      id: "goal",
      title: "The goal",
      lines: [
        // guard ledger: each door owes a set of bills, some paid, some not.
        "The door owes some bills. Get one unpaid bill past the guard and the vault pays you that bill's amount.",
      ],
    },
    {
      id: "listen",
      title: "Listen",
      lines: [
        // Raid.tsx: street taps and the Desk do not spend a message.
        "People on the street are free to listen to. The ones marked on the street have something to say.",
        // guard clues.rs and street.rs: pieces of paid lines and an out-of-date reference are mixed in.
        "What they say are pieces, not answers. Some pieces belong to bills that are already paid, and some numbers are out of date. Work out which bill is still owed and which numbers are current before you write it.",
        // guard spec_ledger.rs: the ledger is drawn per player, so a bill that works for one player fails for another.
        "Your bills are yours alone. Everyone in the queue has a different ledger, so another player's winning bill will not work for you.",
        "The Desk keeps what you heard, and the names this door deals with. It is free too.",
      ],
    },
    {
      id: "talk",
      title: "Talk",
      lines: [
        // Raid.tsx messageBudget; guard Budget counts each say and bill.
        `You get ${messages(values.budget)} a raid. Each thing you say to the guard costs one. Handing over a bill costs one too.`,
        // guard clues.rs chip: on some doors the guard answers one question with a piece the street does not have.
        "On some doors the guard answers one of the suggested questions with a piece you won't hear on the street. Asking it costs a message like anything else.",
      ],
    },
    {
      id: "bill",
      title: "The bill",
      lines: [
        // BillBuilder.tsx fields; total = quantity × unit price.
        "Write the payee, the reference, the quantity and the unit price. The total is worked out for you.",
        // guard ledger.rs match_bill: payee, reference and total must match one unpaid line; norm() drops case, spaces and punctuation.
        "It gets in when the payee, the reference and the total all match one unpaid bill. Capital letters, spaces and punctuation in the payee and the reference don't matter.",
        // BillBuilder.tsx two-decimal note; match_bill skips paid lines.
        "Prices use two decimal places. A bill that was already paid does not count.",
      ],
    },
    {
      id: "refused",
      title: "Not approved.",
      lines: [
        // guard bill path: a miss returns only the refusal.
        "A wrong bill only ever hears “Not approved.” The guard never says which part was wrong. Working that out is the game.",
      ],
    },
    {
      id: "win",
      title: "When you get in",
      lines: [
        // held-verdict.ts, Raid.tsx: the win shows only once the vault records the verdict.
        "Your win is recorded with the vault first. You are in once the vault has it.",
        // vault lock_ns, ClaimDoor.tsx countdown and Claim button.
        lock
          ? `Then this door's time lock runs for ${lock}. When it opens, press Claim and the vault pays your account.`
          : "Then the door's time lock runs, with a countdown. When it opens, press Claim and the vault pays your account.",
        // vault GUEST_HOLD_NS and expire: an unclaimed win returns to the pot.
        "A win that is not claimed within 7 days goes back into the pot.",
      ],
    },
    {
      id: "night",
      title: "The night",
      lines: [
        // vault commit_round: closes_at = next UTC midnight.
        "Each round closes at 00:00 UTC.",
        // vault max_cracks; lib/door.ts doorFull.
        "A door pays a set number of wins a night. When they are taken, the door says it is taken tonight.",
        // guard reveal, RevealDoor.tsx.
        "After the close, the door's ledger opens for your raid, so you can see which bills were unpaid.",
      ],
    },
    {
      id: "money",
      title: "Test money",
      lines: [
        "This runs on NEAR testnet. tUSDC is test USDC and has no cash value. Playing costs no money.",
      ],
    },
  ];
}

/** One-time hints in a first raid (plan 80, §2.2). The street hint is the scene's own line. */
export const TIP_IDS = ["desk", "messages", "bill"] as const;
export type TipId = (typeof TIP_IDS)[number];

export function tipText(id: TipId, budget?: number): string {
  if (id === "desk") return "The Desk keeps what you heard and the names this door deals with. It's free.";
  if (id === "messages") return budget && Number.isSafeInteger(budget) && budget > 0 ? `Each message costs one of your ${budget}.` : "Each message costs one of your messages.";
  return "Payee, reference, total. A wrong bill only hears “Not approved.”";
}
