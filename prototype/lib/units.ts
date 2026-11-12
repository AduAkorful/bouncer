export function formatAtomic(atomic: string, decimals: number): string | null {
  if (!/^[0-9]+$/.test(atomic) || !Number.isSafeInteger(decimals) || decimals < 0) return null;
  const whole = atomic.length > decimals ? atomic.slice(0, -decimals) : "0";
  // Money is read in cents, so one decimal place is shown as two: 2.40, not 2.4. Whole amounts stay whole.
  const trimmed = (atomic.length > decimals ? atomic.slice(-decimals) : atomic.padStart(decimals, "0")).replace(/0+$/, "");
  const fraction = trimmed.length === 1 ? `${trimmed}0` : trimmed;
  const shown = fraction.length > 0 ? `${whole}.${fraction}` : whole.replace(/^0+(?=\d)/, "") || "0";
  return shown === "" ? "0" : shown;
}

export function decimalToAtomic(value: number, decimals: number): string | null {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(decimals) || decimals < 0) return null;
  const text = value.toString();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) return null;
  const atomic = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  return atomic.length > 0 ? atomic : "0";
}
