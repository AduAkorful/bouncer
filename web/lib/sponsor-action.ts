/** A sponsor step must release its controls and explain failure without exposing internal errors. */
export async function runSponsorAction(
  work: () => Promise<string | null>,
  state: { busy: (value: boolean) => void; notice: (value: string | null) => void },
): Promise<void> {
  state.busy(true);
  state.notice(null);
  try {
    state.notice(await work());
  } catch {
    state.notice("This step did not finish. Try again.");
  } finally {
    state.busy(false);
  }
}

export function sponsorDetail(body: unknown, fallback: string): string {
  const detail = body && typeof body === "object" ? (body as { detail?: unknown }).detail : null;
  return typeof detail === "string" && detail.trim().length > 0 ? detail : fallback;
}
