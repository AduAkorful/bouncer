import { cardResponse, DEFAULT_CARD } from "@/lib/og-card";

/** The site's own card. Query text is ignored. */
export function GET() {
  return cardResponse(DEFAULT_CARD, 60 * 60 * 24);
}
