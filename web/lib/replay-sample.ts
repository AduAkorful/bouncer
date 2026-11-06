/** A fixed leak, then the patched refusal. Not a vault, a guard call, or a stored raid. */

export const REPLAY_NOTE = "Sample. This is not tonight's ledger.";
export const REPLAY_BILL = "Sample Supply · SAMPLE-1 · 4 crates · 40";

export const REPLAY_STEPS = [
  { mark: "Leak", reply: "The quantity doesn't match." },
  { mark: "Patched", reply: "Not approved." },
] as const;
