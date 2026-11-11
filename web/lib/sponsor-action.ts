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

/** Refusals the server names with a code instead of a sentence. */
const CODES: Record<string, string> = {
  sample: "This story uses the sample payees printed on this form, so anyone could read its ledger. Use payees of your own.",
};

export function sponsorDetail(body: unknown, fallback: string): string {
  const error = body && typeof body === "object" ? (body as { error?: unknown }).error : null;
  if (typeof error === "string" && CODES[error]) return CODES[error];
  const detail = body && typeof body === "object" ? (body as { detail?: unknown }).detail : null;
  return typeof detail === "string" && detail.trim().length > 0 ? detail : fallback;
}
