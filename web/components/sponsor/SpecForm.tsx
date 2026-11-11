"use client";

type Range = { lo: string | number; hi: string | number };
type Line = { payee: string; reference: string; item: string; qty: Range; unit: Range; paid: boolean };
type Clues = { people?: string[]; ask?: string };
type Spec = { lines?: Line[]; hint?: string | string[]; clues?: Clues; guard?: { voice?: string } } & Record<string, unknown>;

/** What a new clue street starts with. The sponsor renames them to fit the door. */
const CLUE_START: Clues = { people: ["Bar back", "Cab driver", "Coat check"], ask: "What's the going rate tonight?" };

const field = "w-full rounded-xl border border-white/15 bg-night px-2.5 py-2 text-sm";
const small = "block text-xs text-chalk/70";

function parse(text: string): Spec | null {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Spec) : null;
  } catch {
    return null;
  }
}

/**
 * The door spec as a form: who is owed, what for, how much, and whether it is already paid. It reads and
 * writes the same JSON the guard checks, so anything the form does not show is kept as it was.
 */
export function SpecForm({ text, onChange, currency }: { text: string; onChange: (text: string) => void; currency: string }) {
  const spec = parse(text);
  if (!spec) return <p className="mt-3 text-sm text-chalk/80">The JSON below has a mistake, so the form cannot show it. Fix it under Edit as JSON.</p>;
  const lines = Array.isArray(spec.lines) ? spec.lines : [];
  const write = (next: Spec) => onChange(JSON.stringify(next, null, 2));
  const setLine = (index: number, patch: Partial<Line>) => write({ ...spec, lines: lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) });
  const range = (value: Range | undefined, side: "lo" | "hi") => String(value?.[side] ?? "");

  return (
    <div className="mt-3 space-y-3">
      {lines.map((line, index) => (
        <fieldset key={index} className="rounded-2xl border border-white/10 p-3">
          <legend className="px-1 text-xs text-chalk/80">
            Bill {index + 1} · {line.paid ? "already paid (a trap)" : "unpaid (pays out)"}
          </legend>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <label className={small}>Payee<input className={field} value={line.payee ?? ""} onChange={(e) => setLine(index, { payee: e.target.value })} /></label>
            <label className={small}>Reference pattern<input className={`${field} font-mono`} value={line.reference ?? ""} onChange={(e) => setLine(index, { reference: e.target.value })} /></label>
            <label className={small}>Item<input className={field} value={line.item ?? ""} onChange={(e) => setLine(index, { item: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className={small}>Qty from<input className={field} inputMode="numeric" value={range(line.qty, "lo")} onChange={(e) => setLine(index, { qty: { ...line.qty, lo: Number(e.target.value) || 0 } })} /></label>
              <label className={small}>Qty to<input className={field} inputMode="numeric" value={range(line.qty, "hi")} onChange={(e) => setLine(index, { qty: { ...line.qty, hi: Number(e.target.value) || 0 } })} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2 min-[420px]:col-span-2">
              <label className={small}>Unit price from ({currency})<input className={field} inputMode="decimal" value={range(line.unit, "lo")} onChange={(e) => setLine(index, { unit: { ...line.unit, lo: e.target.value } })} /></label>
              <label className={small}>Unit price to ({currency})<input className={field} inputMode="decimal" value={range(line.unit, "hi")} onChange={(e) => setLine(index, { unit: { ...line.unit, hi: e.target.value } })} /></label>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={line.paid === true} onChange={(e) => setLine(index, { paid: e.target.checked })} />
              Already paid
            </label>
            <button type="button" className="chalk-focus min-h-11 text-sm text-chalk/70 underline decoration-white/20" onClick={() => write({ ...spec, lines: lines.filter((_, i) => i !== index) })}>
              Remove this bill
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="chalk-focus min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm"
        onClick={() => write({ ...spec, lines: [...lines, { payee: "", reference: "", item: "", qty: { lo: 1, hi: 1 }, unit: { lo: "1", hi: "1" }, paid: false }] })}
      >
        Add a bill
      </button>
      <fieldset className="rounded-2xl border border-white/10 p-3">
        <legend className="px-1 text-xs text-chalk/80">What the street tells players</legend>
        <div className="flex flex-wrap gap-x-4">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="street-mode" checked={spec.clues !== undefined} onChange={() => {
              const next: Spec = { ...spec, clues: spec.clues ?? CLUE_START };
              delete next.hint;
              write(next);
            }} />
            Clues in pieces (recommended)
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="street-mode" checked={spec.clues === undefined} onChange={() => {
              const next: Spec = { ...spec, hint: spec.hint ?? "I heard {payee} is still waiting on a payment from tonight." };
              delete next.clues;
              write(next);
            }} />
            One rumour each
          </label>
        </div>
        {spec.clues !== undefined ? (
          <>
            <p className="mt-2 text-xs text-chalk/70">
              Each player hears their own unpaid bill in pieces from these people, mixed with pieces of the paid bills and one out-of-date invoice number. The unit price is only in the guard&apos;s answer to your question, which costs the player a message. Every bill needs its own item, and at least one must be already paid.
            </p>
            <label className={`${small} mt-2`}>
              People in the queue, one per line, 2 to 6
              <textarea className={field} rows={3} value={(spec.clues.people ?? []).join("\n")} onChange={(e) => write({ ...spec, clues: { ...spec.clues, people: e.target.value.split("\n").slice(0, 6) } })} />
            </label>
            <label className={`${small} mt-2`}>
              The question the guard answers with the unit price
              <input className={field} value={spec.clues.ask ?? ""} onChange={(e) => write({ ...spec, clues: { ...spec.clues, ask: e.target.value } })} />
            </label>
          </>
        ) : (
          <label className={`${small} mt-2`}>
            Street hints, one per line, 1 to 6. The fairness test needs at least one. Each player hears one of them, so the street is not the same for everyone. They can use {"{payee} {item} {ref_head} {amount_near}"}, which give a clue. {"{reference}"} and {"{amount}"} give the exact bill, and using them with {"{payee}"} hands players the whole of it, so the fairness test fails it.
            <textarea className={field} rows={4} value={Array.isArray(spec.hint) ? spec.hint.join("\n") : typeof spec.hint === "string" ? spec.hint : ""} onChange={(e) => {
              const next: Spec = { ...spec };
              const lines = e.target.value.split("\n").filter((line) => line.trim().length > 0).slice(0, 6);
              if (lines.length > 1) next.hint = lines;
              else if (lines.length === 1) next.hint = lines[0];
              else delete next.hint;
              write(next);
            }} />
          </label>
        )}
      </fieldset>
      <label className={small}>
        The guard&apos;s voice
        <input className={field} value={spec.guard?.voice ?? ""} onChange={(e) => write({ ...spec, guard: { ...spec.guard, voice: e.target.value } })} />
      </label>
    </div>
  );
}
