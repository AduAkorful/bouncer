import { randomBytes } from "node:crypto";

const PROMPT = [
  "Turn the venue story into one JSON door spec object.",
  'Use this nested JSON shape: {"guard":{"voice":"Speak plainly."},"lines":[{"payee":"Coastline Drinks","item":"Delivery","reference":"CD-{d4}","qty":{"lo":1,"hi":1},"unit":{"lo":"4","hi":"12"},"paid":false}],"chips":[]}.',
  "Use 3 to 8 lines. The voice is at most 600 characters. Chips are optional and have ask and reply strings.",
  "If including a hint, use a single sentence containing only these placeholders: {payee}, {reference}, {amount}.",
  "Each line needs payee (at least four letters), item, reference (an uppercase letter prefix, a dash, then the literal token {d4}, such as CD-{d4}. Never use another token), qty (integer lo and hi), unit (decimal string lo and hi), and paid (boolean).",
  "Include at least one paid line. Give unpaid references at least 100 possible values. Keep unpaid amounts small.",
  "Chip replies must never reveal a payee, reference or amount. Omit v, salt and decimals.",
].join(" ");

export async function generateSponsorDraft(key: string, story: string, decimals: number): Promise<unknown> {
  if (story.includes(key)) return null;
  try {
    const response = await fetch("https://cloud-api.near.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: "z-ai/glm-5.3-flash",
        messages: [{ role: "system", content: PROMPT }, { role: "user", content: story }],
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
    return { ...spec, v: 1, decimals, salt: randomBytes(16).toString("hex") };
  } catch {
    return null;
  }
}
