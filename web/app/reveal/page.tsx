import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { RevealGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("The ledger", "A round's ledger, shown once the round has closed.", { index: false });

export default function RevealPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <RevealGate />
    </Suspense>
  );
}
