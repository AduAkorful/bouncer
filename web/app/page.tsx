import { Suspense } from "react";
import { screen } from "@/lib/screen";
import { Landing } from "@/components/landing/Landing";
import { LandingLive } from "@/components/gates";

export const metadata = screen("Bouncer", "Get a bill past the door. Six messages. A wrong bill says Not approved.", { path: "/" });

export default function Page() {
  return (
    <Landing
      live={
        <Suspense fallback={null}>
          <LandingLive />
        </Suspense>
      }
    />
  );
}
