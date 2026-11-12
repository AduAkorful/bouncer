"use client";

import { useEffect, useState } from "react";
import { readAttestation } from "@/lib/attestation-read";
import type { ProofBundle } from "@/lib/proof-bundle";
import { proofRows, verifyCommands, type AttestationState, type Row } from "@/lib/proof-rows";
import { verifyVerdict } from "@/lib/verdict-check";

const POLL_MS = 4000;
const POLLS = 8;

const BADGE: Record<Row["status"], { word: string; tone: string }> = {
  ok: { word: "Checked", tone: "border-uv/50 text-chalk" },
  bad: { word: "Does not match", tone: "border-rope/60 text-chalk" },
  unchecked: { word: "Not checked", tone: "border-white/15 text-chalk/70" },
};

/**
 * The evidence behind a win. Each row is ticked only when this page compared the two things itself, and
 * anything it could not compare says so. Commands under it let anyone repeat the checks.
 */
export function VerifiedPanel({
  bundle,
  verdict,
  signature,
  guardKey,
  outlayerApiUrl,
  guardVersion,
  pastGuardVersions = [],
}: {
  bundle: ProofBundle | null;
  verdict: Record<string, unknown> | null;
  signature: string | null;
  guardKey: string | null;
  /** Where this browser reads the attestation itself. Unset, the attestation rows stay unchecked. */
  outlayerApiUrl: string | null;
  /** The guard version built into this site, not one a server hands over. */
  guardVersion: string | null;
  /** Guard versions published before the current one, also built into this site. */
  pastGuardVersions?: string[];
}) {
  const [attestation, setAttestation] = useState<AttestationState>({ state: "none" });
  const [signed, setSigned] = useState<boolean | null | "none">(verdict && signature ? null : "none");
  const [copied, setCopied] = useState(false);
  const callId = bundle?.verdictCall?.callId ?? null;

  useEffect(() => {
    let cancel = false;
    if (!verdict || !signature) {
      setSigned("none");
      return;
    }
    if (!guardKey) {
      setSigned(null);
      return;
    }
    void verifyVerdict(verdict, signature, guardKey).then((result) => {
      if (!cancel) setSigned(result);
    });
    return () => {
      cancel = true;
    };
  }, [verdict, signature, guardKey]);

  useEffect(() => {
    if (!callId) {
      setAttestation({ state: "none" });
      return;
    }
    if (!outlayerApiUrl || !guardVersion) {
      setAttestation({ state: "unpinned" });
      return;
    }
    let cancel = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setAttestation({ state: "pending" });
    const look = async (attempt: number) => {
      const answer = await readAttestation(outlayerApiUrl, callId);
      if (cancel) return;
      if (answer.ok) {
        setAttestation({ state: "ok", value: answer.attestation, pinned: guardVersion, earlier: pastGuardVersions });
      } else if (answer.pending && attempt < POLLS) {
        timer = setTimeout(() => void look(attempt + 1), POLL_MS);
      } else if (answer.pending) {
        setAttestation({ state: "pending" });
      } else {
        setAttestation({ state: "failed" });
      }
    };
    void look(1);
    return () => {
      cancel = true;
      if (timer) clearTimeout(timer);
    };
  }, [callId, outlayerApiUrl, guardVersion]);

  const rows = proofRows({ bundle, attestation, signature: signed });
  const commands = verifyCommands(bundle);
  const preflight = bundle?.preflight;

  return (
    <section aria-labelledby="verified-heading" className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
      <h2 id="verified-heading" className="font-sign text-2xl">Verified</h2>
      <p className="mt-1 text-sm text-chalk/70">What this page could check about how this win was decided. Nothing is ticked unless it was compared. <a href="/how-it-works#hiw-5" className="chalk-focus underline decoration-white/20">What these checks mean</a></p>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${BADGE[row.status].tone}`}>{BADGE[row.status].word}</span>
              <span className="font-medium">{row.label}</span>
            </div>
            <p className="mt-1 text-chalk/70">{row.detail}</p>
          </li>
        ))}
      </ul>
      {preflight ? (
        <p className="mt-4 text-xs text-chalk/70">
          Model: {preflight.model}. Attestation report taken when this raid opened, nonce <span className="break-all font-mono">{preflight.nonce.slice(0, 16)}…</span>, {preflight.reportBytes.toLocaleString()} bytes, hash <span className="break-all font-mono">{preflight.reportSha256.slice(0, 16)}…</span>.
        </p>
      ) : null}
      {bundle?.verdictCall ? (
        <a href={bundle.verdictCall.url} target="_blank" rel="noreferrer" className="chalk-focus mt-4 inline-flex min-h-11 items-center text-sm text-chalk underline decoration-white/20">
          Read the raw attestation
        </a>
      ) : null}
      {commands.length > 0 ? (
        <details className="mt-3">
          <summary className="chalk-focus min-h-11 cursor-pointer py-2 text-sm text-chalk/80">Check it yourself</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-night p-3 font-mono text-xs text-chalk/80">{commands.join("\n")}</pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(commands.join("\n")).then(() => setCopied(true), () => setCopied(false));
            }}
            className="chalk-focus mt-2 min-h-11 rounded-2xl border border-chalk/30 px-4 text-sm"
          >
            {copied ? "Copied" : "Copy the commands"}
          </button>
        </details>
      ) : null}
    </section>
  );
}
