import { redirect } from "next/navigation";

// The verdict now plays inside the door scene; see /play.
export default function VerdictFrame() {
  redirect("/play");
}
