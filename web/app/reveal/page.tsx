import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { RevealGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("Last night's door", "The ledger from the round that closed.");

export default function RevealPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <RevealGate />
    </Suspense>
  );
}
