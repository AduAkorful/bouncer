import type { Rpc } from "./chain.ts";
import { parseLimits } from "./sponsor-views.ts";
import { viewRequest } from "./vault.ts";

export type SponsorAvailability = "open" | "closed" | "unknown";

/** Read the registry's current self-serve setting without connecting a sponsor. */
export async function sponsorAvailability(rpc: Rpc, contractId: string): Promise<SponsorAvailability> {
  try {
    const result = await rpc(viewRequest(contractId, "get_limits", {}));
    if (!result.ok) return "unknown";
    const limits = parseLimits(result.value);
    return limits.ok ? (limits.value.selfServe ? "open" : "closed") : "unknown";
  } catch {
    return "unknown";
  }
}
