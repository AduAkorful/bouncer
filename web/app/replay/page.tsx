import { ReplaySample } from "@/components/replay/ReplaySample";
import { screen } from "@/lib/screen";

export const metadata = screen("A patched refusal", "Sample. This is not tonight's ledger.", { index: false });

export default function Page() {
  return <ReplaySample />;
}
