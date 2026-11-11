import { Landing } from "@/components/landing/Landing";
import { LiveDoor } from "@/components/landing/LiveDoor";
import { CLOSE_NS, POT, TOKEN, doorSpec, frontId } from "@/lib/demo/world";

export default function Page() {
  const spec = doorSpec(frontId())!;
  return <Landing live={<LiveDoor sign={spec.sign} href="/frames/home" dayPot={POT} closesAt={CLOSE_NS} token={TOKEN} />} />;
}
