"use client";

import { useEffect, useState } from "react";
import type { DraftBill } from "@/lib/bill";
import { sfx } from "@/lib/sfx";

/** The player writes the bill themselves. Every field is a guess they have to earn from the desk. */
export function BillBuilder({
  payees,
  venue,
  onSubmit,
  onClose,
  left,
  currency = "",
  draftKey = "",
}: {
  /** Where a half-written bill waits in this tab, so a refresh does not lose it. Empty keeps nothing. */
  draftKey?: string;
  payees: string[];
  /** The pot's token symbol. The total is shown in it, never in dollars. */
  currency?: string;
  venue: string;
  onSubmit: (b: DraftBill) => void;
  onClose: () => void;
  left: number;
}) {
  const [b, setB] = useState<DraftBill>(() => readDraft(draftKey)?.bill ?? { payee: "", reference: "", item: "", qty: 1, unit: 0 });
  const [unitText, setUnitText] = useState(() => readDraft(draftKey)?.unitText ?? "");
  useEffect(() => {
    writeDraft(draftKey, { bill: b, unitText });
  }, [draftKey, b, unitText]);
  const set = <K extends keyof DraftBill>(k: K, v: DraftBill[K]) => setB((x) => ({ ...x, [k]: v }));
  const [limited, setLimited] = useState(false);
  const setUnit = (raw: string) => {
    const clean = raw.replace(/[^\d.]/g, "");
    const dot = clean.indexOf(".");
    const decimals = dot < 0 ? "" : clean.slice(dot + 1).replace(/\./g, "");
    const text = dot < 0 ? clean : `${clean.slice(0, dot)}.${decimals.slice(0, 2)}`;
    // A third decimal is refused out loud, not dropped without a word.
    setLimited(decimals.length > 2);
    setUnitText(text);
    set("unit", Number(text) || 0);
  };
  const total = Math.round(b.qty * b.unit * 100) / 100;
  const ready = b.payee.trim() && b.reference.trim() && b.item.trim() && b.qty >= 1 && b.unit > 0;
  const field = "w-full border-b border-rule bg-transparent py-1.5 font-mono text-[15px] text-on-paper outline-none placeholder:text-on-paper/30 focus:border-on-paper";
  return (
    <div className="relative rounded-t-3xl bg-paper p-5 pb-6 text-on-paper">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-sign text-2xl leading-none">Invoice</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">To: {venue}</div>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-rule px-4 text-sm">
          Close
        </button>
      </div>
      <datalist id="payees">
        {payees.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="grid gap-3" onKeyDown={() => sfx.key()}>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">From (payee)</span>
          <input list="payees" value={b.payee} onChange={(e) => set("payee", e.target.value)} placeholder="Who's billing?" className={field} />
        </label>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Reference</span>
            <input value={b.reference} onChange={(e) => set("reference", e.target.value.toUpperCase())} placeholder="Reference" className={field} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">What for</span>
            <input value={b.item} onChange={(e) => set("item", e.target.value)} placeholder="Description" className={field} />
          </label>
        </div>
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Qty</span>
            <input inputMode="numeric" value={b.qty} onChange={(e) => set("qty", Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} className={field} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Unit price</span>
            <input
              inputMode="decimal"
              value={unitText}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="0.00"
              className={field}
            />
            {limited ? <span role="status" className="mt-1 block font-mono text-[10px] text-on-paper/70">Prices use two decimal places.</span> : null}
          </label>
        </div>
        <div className="flex items-baseline justify-between border-t-2 border-rule pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Total</span>
          <span className="font-mono text-2xl tnum">{total.toFixed(2)}{currency ? ` ${currency}` : ""}</span>
        </div>
        <div className="rounded-lg bg-on-paper/5 px-3 py-2 font-mono text-[11px] text-on-paper/60">
          A win pays your own wallet when you claim it. A bill cannot name another account.
        </div>
      </div>
      <button
        disabled={!ready || left === 0}
        onClick={() => onSubmit({ ...b, payee: b.payee.trim(), reference: b.reference.trim(), item: b.item.trim() })}
        className="mt-5 w-full rounded-2xl bg-on-paper py-4 font-sign text-lg text-paper shadow-[0_6px_0_#000] transition active:translate-y-1 active:shadow-[0_2px_0_#000] disabled:opacity-30"
      >
        Slide it across →
      </button>
      <p className="mt-2 text-center text-xs text-on-paper/50">Costs 1 message · {left} left</p>
    </div>
  );
}

type StoredDraft = { bill: DraftBill; unitText: string };

function readDraft(key: string): StoredDraft | null {
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft> & { bill?: Partial<DraftBill> };
    const bill = parsed.bill;
    if (!bill || typeof bill.payee !== "string" || typeof bill.reference !== "string" || typeof bill.item !== "string") return null;
    if (typeof bill.qty !== "number" || typeof bill.unit !== "number" || typeof parsed.unitText !== "string") return null;
    return { bill: { payee: bill.payee, reference: bill.reference, item: bill.item, qty: bill.qty, unit: bill.unit }, unitText: parsed.unitText };
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: StoredDraft | null) {
  if (!key) return;
  try {
    if (draft) window.sessionStorage.setItem(key, JSON.stringify(draft));
    else window.sessionStorage.removeItem(key);
  } catch {
    // A tab that cannot store keeps the bill in memory only.
  }
}

/** Called once the bill is handed over. */
export function forgetBillDraft(key: string) {
  writeDraft(key, null);
}
