import { randomBytes } from "node:crypto";
import { fromBaseUnits, toBaseUnits } from "../../web/lib/token.ts";

const PROMPT = [
  "Turn the venue story into one JSON door spec object.",
  'Use this nested JSON shape: {"guard":{"voice":"Speak plainly."},"lines":[{"payee":"<a supplier from the story>","item":"Delivery","reference":"AB-{d4}","qty":{"lo":1,"hi":1},"unit":{"lo":"4","hi":"12"},"paid":false}],"chips":[]}.',
  "Use 3 to 8 lines. The voice is at most 600 characters. Chips are optional and have ask and reply strings.",
  "If you include a hint, make it one sentence using only these placeholders: {payee}, {item}, {ref_head}, {amount_near}. Never use {reference} or {amount} in a hint, because together with {payee} they give away the whole bill.",
  "Each line needs payee (at least four letters), item, reference (an uppercase letter prefix, a dash, then the literal token {d4}, such as CD-{d4}. Never use another token), qty (integer lo and hi), unit (decimal string lo and hi), and paid (boolean).",
  "Include at least one paid line. Give unpaid references at least 100 possible values. Keep unpaid amounts small.",
  "Chip replies must never reveal a payee, reference or amount. Omit v, salt and decimals.",
].join(" ");

export async function generateSponsorDraft(key: string, story: string, decimals: number, cap?: string): Promise<unknown> {
  if (story.includes(key)) return null;
  const instructions = cap === undefined ? PROMPT : [
    PROMPT,
    `The payout cap is ${fromBaseUnits(BigInt(cap), decimals)} whole units. For every unpaid line, qty.hi times unit.hi must be at or below that cap.`,
    "Use distinct reference prefixes for every line. For unpaid lines use quantity 1 and a unit range at least 0.49 units wide, within the cap.",
    "Include an unpaid line with a reference and at least one paid line. Give every line a different item. Omit hint and clues; the server supplies them.",
  ].join(" ");
  try {
    const response = await fetch("https://cloud-api.near.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: "z-ai/glm-5.3-flash",
        messages: [{ role: "system", content: instructions }, { role: "user", content: story }],
        chat_template_kwargs: { reasoning_effort: "low" },
        max_tokens: 4096,
        stream: false,
      }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length > 16_384 || content.includes(key)) return null;
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first < 0 || last <= first) return null;
    const spec = JSON.parse(content.slice(first, last + 1));
    return {
      ...spec,
      v: 1,
      decimals,
      salt: randomBytes(16).toString("hex"),
      // Plan 85: the street gives each player their bill in pieces. The sponsor renames the people on the form.
      ...(cap === undefined ? {} : { hint: undefined, clues: { people: ["Bar back", "Cab driver", "Coat check"], ask: "What's the going rate tonight?" } }),
    };
  } catch {
    return null;
  }
}

/** The guard samples ledgers. Also check each range's exact upper bound. */
export function draftFitsCap(spec: unknown, cap: bigint, decimals: number): boolean {
  const lines = (spec as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return false;
  let hasClue = false;
  for (const line of lines) {
    if (line?.paid === true) continue;
    const quantity = line?.qty?.hi;
    const amount = typeof line?.unit?.hi === "string" ? toBaseUnits(line.unit.hi, decimals) : null;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || amount === null || amount * BigInt(quantity) > cap) return false;
    if (typeof line.reference === "string" && line.reference.length > 0) hasClue = true;
  }
  return hasClue;
}
