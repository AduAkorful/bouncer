import { screen } from "@/lib/screen";
import { Landing } from "@/components/landing/Landing";

export const metadata = screen("Bouncer", "Talk your way past the bouncer.");

export default function Page() {
  return <Landing />;
}
