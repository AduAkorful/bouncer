/**
 * The relay pays for new accounts (0.2 NEAR each), every recorded verdict, and every claim's gas. When it runs dry,
 * players and sponsors fail with no warning, so its balance is read on a timer and logged, and /status says whether it is low.
 */
export const RELAY_LOW_YOCTO = 1_000_000_000_000_000_000_000_000n; // 1 NEAR

export type RelayState = { checked: boolean; low: boolean };

export function createRelayWatch(rpcUrl: string, accountId: string, log: (line: string) => void, fetchImpl: typeof fetch = fetch) {
  let state: RelayState = { checked: false, low: false };
  async function check(): Promise<RelayState> {
    try {
      const response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "relay", method: "query", params: { request_type: "view_account", finality: "final", account_id: accountId } }),
      });
      const body = (await response.json()) as { result?: { amount?: unknown } };
      const amount = typeof body.result?.amount === "string" && /^[0-9]+$/.test(body.result.amount) ? BigInt(body.result.amount) : null;
      if (amount === null) return state;
      const low = amount < RELAY_LOW_YOCTO;
      if (low && !state.low) log("relay balance is low: new accounts and claims will start to fail until it is topped up");
      state = { checked: true, low };
    } catch {
      // A failed read leaves the last answer in place.
    }
    return state;
  }
  return { check, state: () => state };
}
