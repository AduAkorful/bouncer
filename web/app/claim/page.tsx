import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { ClaimGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("Your cut", "The payout for a raid on this device.");

export default function ClaimPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <ClaimGate />
    </Suspense>
  );
}
