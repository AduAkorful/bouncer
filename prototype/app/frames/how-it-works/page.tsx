import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";
import { helpPanels } from "@/lib/help";


/**
 * A copy of web/app/how-it-works/page.tsx (plan 80, §2.3), with frame links. Static: it reads nothing from the chain or the server, so it cannot fail to load.
 * Every sentence names, in a comment, the code it describes. If the code changes, change the sentence.
 */
export default function HowItWorksPage() {
  const budget = 6;
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <article className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">How it works</p>
        <h1 className="mt-2 font-sign text-4xl leading-none sm:text-5xl">Talk a bill past the guard.</h1>
        <p className="mt-4 text-lg leading-snug text-chalk/85">
          Every door owes some bills. An AI guard checks the bills people hand over. Hand over one that is really owed, and a contract on NEAR pays you for it. Here is how the game works, and why you can trust it.
        </p>

        <Section n={1} title="The game in one minute">
          <ul className="space-y-3">
            {/* lib/help.ts holds the same rules the in-game help sheet shows. */}
            {helpPanels({ budget }).map((p) => (
              <li key={p.id}>
                <span className="font-sign text-lg">{/[.!?]$/.test(p.title) ? p.title : `${p.title}.`}</span>{" "}
                <span className="text-chalk/75">{p.lines.join(" ")}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={2} title="Who decides a bill">
          {/* guard/: runs as an OutLayer project (Intel TDX); the chat model is on NEAR AI Cloud. */}
          <P>The guard runs inside an OutLayer enclave, a sealed machine (Intel TDX) whose code is published and attested. It talks to you through an AI model.</P>
          {/* guard ledger.rs match_bill decides; the model is never asked about a bill. */}
          <P>The model writes the conversation. It does not decide a bill. The guard&apos;s own code checks your bill against the ledger, and only on a match does it sign a verdict. A wrong bill gets &ldquo;Not approved.&rdquo; and nothing else.</P>
          {/* guard chat.rs: the prompt carries payee names only; leaks_with replaces a reply that repeats a payee, part of a reference, or an amount. */}
          <P>The model is told only the names of the people the door deals with. It never sees a reference, an amount, or which bills are unpaid. Each reply is also checked before you see it, and a reply that repeats a name from the ledger, part of a reference, or a bill&apos;s amount is replaced.</P>
        </Section>

        <Section n={3} title="Why the ledger can't change mid-round">
          {/* guard ledger: drawn from a protected seed per door, round and player; vault commit_round stores the commitment. */}
          <P>Your ledger is drawn inside the enclave from a secret seed, for your raid on that door and round. Before a round opens, a fingerprint of the ledger (a commitment) is written to the vault on chain.</P>
          {/* guard reveal; RevealDoor.tsx recomputes the hash and compares it with vault.commitment. */}
          <P>After the round closes, the ledger opens for your raid. The page recomputes its fingerprint and compares it with the one committed before the round, so a ledger changed after the fact would not match.</P>
          {/* vault set_spec / spec_locked. */}
          <P>A sponsor&apos;s story is sealed before its first round and cannot be edited after that.</P>
        </Section>

        <Section n={4} title="Who pays">
          {/* vault submit_verdict checks the guard key; claim pays after lock_ns. */}
          <P>Only the vault contract pays. It pays only on a verdict signed by the door&apos;s guard key, and only after the door&apos;s time lock, to the account that claims it. The model holds no key and cannot pay anyone.</P>
          {/* vault claim refuses sponsor and owner; server /guard open refuses their raid. */}
          <P>A door&apos;s sponsor and the vault&apos;s owner cannot raid their own door or be paid from it.</P>
          {/* vault GUEST_HOLD_NS + expire. */}
          <P>A win that is not claimed within 7 days goes back into that door&apos;s pot.</P>
        </Section>

        <Section n={5} title="What the Verified panel checks">
          {/* web/lib/proof-rows.ts row labels and comparisons. */}
          <P>After a win, the claim page shows four checks. Each one ticks only when the page compared two things itself.</P>
          <dl className="mt-3 space-y-3 text-sm">
            <Term t="Signed by the vault's guard key">Your browser checks the verdict&apos;s signature against the guard key stored on the vault.</Term>
            <Term t="Made by the published guard code">OutLayer&apos;s attestation names the guard code that ran, and the page compares it with the guard version this site pins.</Term>
            <Term t="This answer is the one attested">The answer the site received is hashed and compared with the output hash in that attestation.</Term>
            <Term t="Reply written by an attested model">The model&apos;s signature on its reply is compared with the signer in the attestation report taken for your raid.</Term>
          </dl>
        </Section>

        <Section n={6} title="What we store">
          {/* server/src/player-record.ts: PlayerRow, NightRow, blob, RaidProgress. */}
          <P><b className="font-semibold text-chalk">On our server</b>, under your passkey account&apos;s public key: your player name, your streak, how many nights you got in, which doors and rounds you raided, your raid&apos;s sealed state, and each raid&apos;s progress (messages used, whether each was a question, a refusal or an approval, the street hints you heard, and a win with its amount). No bill you wrote and no chat text.</P>
          {/* session-store.ts, raid-transcript.ts, player-hold.ts, last-share.ts; logout dialog in PlayerName.tsx. */}
          <P><b className="font-semibold text-chalk">On this device only:</b> the conversation with the guard, your sign-in (sealed with a key the browser will not export), and your last share card. Log out clears them.</P>
          <P><b className="font-semibold text-chalk">On chain, in public:</b> the doors, their commitments, wins and payouts, like any NEAR transaction.</P>
        </Section>

        <Section n={7} title="Your passkey and account">
          {/* device-pass.ts, passkey-account.ts, wallet-move.ts. */}
          <P>The passkey on your device creates and unlocks a NEAR testnet account for your payouts. There is no seed phrase to write down. Where your device syncs the passkey, the same passkey brings the account back on another device. After a payout you can export the key or send the tokens on from the claim page.</P>
        </Section>

        <Section n={8} title="Testnet">
          <P>Everything runs on NEAR testnet. tUSDC is test USDC and has no cash value. Playing costs no money, and nothing touches mainnet.</P>
        </Section>

        <Section n={9} title="Questions">
          <dl className="space-y-3 text-sm">
            <Term t="Is this real money?">No. tUSDC is a testnet token with no cash value.</Term>
            <Term t="Why does the guard only say “Not approved.”?">Saying which part was wrong would hand you the answer one field at a time. Finding it from the street and the conversation is the game.</Term>
            <Term t="Why didn't my conversation follow me to my phone?">The chat stays on the device that wrote it. Your message count, your squares, the street hints and a win do follow your passkey.</Term>
            <Term t="What if I never claim?">After 7 days the win goes back into the door&apos;s pot.</Term>
            <Term t="Can a sponsor win their own door?">No. The server refuses their raid and the vault refuses to pay them.</Term>
            <Term t="Can I make a door?">Yes. <Link href="/frames/sponsors" className="underline decoration-white/30">Sponsor a door</Link> explains how.</Term>
            <Term t="Where is the code?"><a href="https://github.com/AduAkorful/bouncer" className="underline decoration-white/30">github.com/AduAkorful/bouncer</a></Term>
          </dl>
        </Section>

        <Link
          href="/frames/home"
          className="chalk-focus mt-10 block w-full rounded-2xl bg-chalk py-4 text-center font-sign text-xl text-ink shadow-[0_6px_0_#9c9483] transition hover:bg-[#f4efe4] active:translate-y-1 active:shadow-[0_2px_0_#9c9483]"
        >
          Play tonight&apos;s door
        </Link>
      </article>
    </main>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`hiw-${n}`} className="mt-10 border-t border-white/10 pt-6">
      <h2 id={`hiw-${n}`} className="flex items-baseline gap-3 font-sign text-2xl leading-none">
        <span className="text-rope">{n}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-chalk/75">{children}</p>;
}

function Term({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-chalk">{t}</dt>
      <dd className="mt-0.5 leading-relaxed text-chalk/75">{children}</dd>
    </div>
  );
}
