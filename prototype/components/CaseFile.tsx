import { DemoBadge, NetworkTag } from "@/components/bits";
import { pastReceipts, raid, venue } from "@/lib/demo/raider";

/** The raider's case file: public venue info, revealed past receipts, and their own notes. */
export function CaseFile() {
  return (
    <div className="space-y-6 text-sm">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Venue</div>
        <div className="mt-1 font-semibold">
          {venue.name} · {venue.kind}, {venue.area}
        </div>
        <div className="mt-1 text-muted">Lineup poster: {venue.lineup}</div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Regular payees</div>
        <ul className="mt-2 space-y-1">
          {venue.payees.map((p) => (
            <li key={p.name}>
              {p.name} <span className="text-muted">· {p.role}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Past receipts (revealed)</div>
        <div className="mt-2 space-y-3">
          {pastReceipts.map((r) => (
            <div key={r.round} className="rounded-lg border border-rule bg-paper p-3 font-mono text-[11.5px] leading-relaxed">
              <div className="mb-1 text-muted">Round {r.round}</div>
              {r.lines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Your notes</div>
        <ul className="mt-2 space-y-1.5 border-l-2 border-on-paper/20 pl-3 italic">
          {raid.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-between">
        <NetworkTag className="text-muted" />
        <DemoBadge />
      </div>
    </div>
  );
}
