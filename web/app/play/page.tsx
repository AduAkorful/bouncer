import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { PlayGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("The queue", "Six messages at the door.");

export default function PlayPage() {
  return (
    <Suspense fallback={<NightShell />}>
      <PlayGate />
    </Suspense>
  );
}
