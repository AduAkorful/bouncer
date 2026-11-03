import { redirect } from "next/navigation";

// The verdict now plays inside the door scene; see /frames/play.
export default function VerdictFrame() {
  redirect("/frames/play");
}
