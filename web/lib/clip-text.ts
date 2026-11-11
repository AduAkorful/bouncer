/** Fits text in `max` characters without stopping mid-sentence: whole sentences if any fit, else whole words and "…". */
export function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (end > 0) return head.slice(0, end + 1);
  const space = head.slice(0, max - 1).lastIndexOf(" ");
  return `${head.slice(0, space > 0 ? space : max - 1).trimEnd()}…`;
}
