import { screen } from "@/lib/screen";
import { Landing } from "@/components/landing/Landing";

export const metadata = screen("Bouncer", "Get a bill past the door. Six messages. A wrong bill says Not approved.");

export default function Page() {
  return <Landing />;
}
