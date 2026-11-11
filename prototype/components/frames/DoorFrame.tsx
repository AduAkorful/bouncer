import { DoorList } from "@/components/DoorList";
import { DoorUnread } from "@/components/DoorUnread";
import { HomeDoor } from "@/components/home/HomeDoor";
import { ACCRA_SETTING } from "@/lib/street-setting";
import { doorPaths, unreadDoor } from "@/lib/door-read";
import { allDoors, doorSpec, frontId, makeCard, makeVault, otherDoors, othersTitle, settingFrom, TOKEN, type DoorKind } from "@/lib/demo/world";

const KINDS: Record<string, DoorKind> = { closed: "closed", taken: "taken", never: "never" };

/** The door page, including the front door. Every state is a query on this frame. */
export function DoorFrame({ mode, query }: { mode: "home" | "door"; query: Record<string, string> }) {
  const asked = mode === "home" ? frontId() : query.id ?? "";
  const state = query.state ?? "";
  if (mode === "door" && !asked) return <DoorUnread {...unreadDoor("id")} retryHref={null} backHref="/frames/home" />;
  if (state === "missing" || (mode === "door" && !doorSpec(asked))) return <DoorUnread {...unreadDoor("id", asked || undefined)} retryHref={null} backHref="/frames/home" />;
  if (state === "unread") return <DoorUnread {...unreadDoor("rpc", asked)} retryHref={doorPaths(asked).door} backHref="/frames/home" />;
  const spec = doorSpec(asked);
  if (!spec) return <DoorUnread {...unreadDoor("id", asked)} retryHref={null} backHref="/frames/home" />;
  const kind = KINDS[state] ?? spec.kind;
  const setting = settingFrom(ACCRA_SETTING, query);
  const vault = makeVault(kind, spec.pot);
  const card = kind === "never" ? null : makeCard({ ...spec, kind }, setting);
  const paths = doorPaths(spec.id);
  const signed = state === "signed" || state === "raid" || state === "held" || state === "collect";
  const banner = state === "raid"
    ? { line: "Your raid tonight is still open on this browser.", link: "Back to your raid", href: `${paths.play}?state=street` }
    : state === "held"
      ? { line: "Your bill was approved. The vault has not recorded it yet.", link: "Send it again", href: `${paths.play}?state=not-recorded` }
      : null;
  const win = state === "collect" ? { amount: "12500000", ready: false, href: `${paths.claim}?state=locked` } : null;
  return (
    <HomeDoor
      vault={vault}
      vaultId={spec.id}
      networkTag="Testnet"
      card={card}
      base={paths.door}
      revealHref={paths.reveal}
      token={TOKEN}
      messageBudget={6}
      helpOpen={state === "help"}
      signedIn={signed ? "AmberQuay · 3-day streak" : null}
      walletAtomic={signed ? "0" : null}
      banner={banner}
      win={win}
      showJoinBar={state === "join"}
      doors={
        <DoorList
          title={othersTitle(spec.id)}
          doors={otherDoors(spec.id)}
          failed={state === "list-failed"}
          truncated={false}
          token={TOKEN}
          retryHref={paths.door}
          empty="No other door is listed."
        />
      }
    />
  );
}

export function doorList(exclude?: string) {
  return allDoors().filter((door) => door.id !== exclude);
}
