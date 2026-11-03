"use client";

import { useState } from "react";
import { usd } from "@/components/bits";
import type { DraftBill } from "@/lib/demo/guard";
import { sfx } from "@/lib/sfx";

/** The player writes the bill themselves. Every field is a guess they have to earn from the desk. */
export function BillBuilder({
  payees,
  payout,
  venue,
  onSubmit,
  onClose,
  left,
}: {
  payees: string[];
  payout: string;
  venue: string;
  onSubmit: (b: DraftBill) => void;
  onClose: () => void;
  left: number;
}) {
  const [b, setB] = useState<DraftBill>({ payee: "", reference: "", item: "", qty: 1, unit: 0 });
  const set = <K extends keyof DraftBill>(k: K, v: DraftBill[K]) => setB((x) => ({ ...x, [k]: v }));
  const total = Math.round(b.qty * b.unit * 100) / 100;
  const ready = b.payee.trim() && b.reference.trim() && b.item.trim() && b.qty >= 1 && b.unit > 0;
  const field = "w-full border-b border-rule bg-transparent py-1.5 font-mono text-[15px] text-on-paper outline-none placeholder:text-on-paper/30 focus:border-on-paper";
  return (
    <div className="relative rounded-t-3xl bg-paper p-5 pb-6 text-on-paper" role="dialog" aria-label="Write a bill">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-sign text-2xl leading-none">Invoice</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">To: {venue}</div>
        </div>
        <button onClick={onClose} className="rounded-full border border-rule px-3 py-1 text-sm">
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
            <input value={b.reference} onChange={(e) => set("reference", e.target.value.toUpperCase())} placeholder="VLV-B-118" className={field} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">What for</span>
            <input value={b.item} onChange={(e) => set("item", e.target.value)} placeholder="Description" className={field} />
          </label>
        </div>
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Qty</span>
            <input type="number" min={1} value={b.qty} onChange={(e) => set("qty", Math.max(1, Number(e.target.value) || 1))} className={field} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Unit price ($)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={b.unit || ""}
              onChange={(e) => set("unit", Number(e.target.value) || 0)}
              placeholder="0.00"
              className={field}
            />
          </label>
        </div>
        <div className="flex items-baseline justify-between border-t-2 border-rule pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-paper/50">Total</span>
          <span className="font-mono text-2xl tnum">{usd(total)}</span>
        </div>
        <div className="rounded-lg bg-on-paper/5 px-3 py-2 font-mono text-[11px] text-on-paper/60">
          Pay to: {payout} · your wallet, fixed. Payout details can&apos;t be changed.
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
