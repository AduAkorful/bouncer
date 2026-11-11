import { createHash } from "node:crypto";

export function sha256Hex(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}

/** What OutLayer hashed as the call's output: the guard's own text when it is text, else its compact JSON. */
export function outputText(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") return JSON.stringify(output);
  return null;
}
