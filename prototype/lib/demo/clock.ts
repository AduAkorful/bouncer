/** Fixed so a countdown reads the same on every capture. 10 Nov 2026, 21:00 UTC. */
export const DEMO_NOW_MS = Date.UTC(2026, 10, 10, 21, 0, 0);

export function demoNowMs(): number {
  return DEMO_NOW_MS;
}

export function msToNs(ms: number): string {
  return (BigInt(ms) * 1_000_000n).toString();
}
