import { redirect } from "next/navigation";

// The raid is now the door scene; see /play.
export default function RaidFrame() {
  redirect("/play");
}
