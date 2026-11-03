import { redirect } from "next/navigation";

// The raid is now the door scene; see /frames/play.
export default function RaidFrame() {
  redirect("/frames/play");
}
