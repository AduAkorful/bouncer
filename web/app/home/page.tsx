import { screen } from "@/lib/screen";
import { Suspense } from "react";
import { HomeGate } from "@/components/gates";
import { NightShell } from "@/components/NightShell";

export const metadata = screen("The door", "This round's door.", { path: "/home" });

export default function HomePage() {
  return (
    <Suspense fallback={<NightShell door />}>
      <HomeGate />
    </Suspense>
  );
}
