"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { helpPanels, type HelpValues } from "@/lib/help";

/** The "?" help sheet (plan 80, §2.1). Opening it is free: no message, no guard call, no network. */
export function HelpButton({
  values,
  className = "",
  children,
  label,
  initialOpen = false,
}: {
  values: HelpValues;
  className?: string;
  children: ReactNode;
  /** Only when the visible text is not the name, e.g. an icon. Prefer visible or sr-only text. */
  label?: string;
  /** Prototype only: a frame can open on the sheet for a capture (`?state=help`). */
  initialOpen?: boolean;
}) {
  const [open, setOpenState] = useState(initialOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  // The portal target exists only in the browser; the first render matches the server's.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // An open sheet is one history entry, so the phone's Back closes it, like the bill sheet.
  const setOpen = useCallback((next: boolean) => {
    const marked = Boolean((window.history.state as { bouncerHelp?: boolean } | null)?.bouncerHelp);
    if (next && !marked) window.history.pushState({ ...(window.history.state ?? {}), bouncerHelp: true }, "");
    if (!next && marked) {
      window.history.back();
      return;
    }
    setOpenState(next);
  }, []);
  useEffect(() => {
    const state = window.history.state as { bouncerHelp?: boolean } | null;
    if (state?.bouncerHelp) window.history.replaceState({ ...state, bouncerHelp: false }, "");
    const onPop = () => setOpenState(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);
  return (
    <>
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-label={label} onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {/* Rendered at the page root, so a header's stacking layer cannot put the raid's controls above it. */}
      {open && mounted ? createPortal(<HelpSheet values={values} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}

function HelpSheet({ values, onClose }: { values: HelpValues; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = panel.current;
    el?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-paper text-left text-on-paper shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 id={titleId} className="font-sign text-2xl leading-none">How to play</h2>
          <button data-autofocus onClick={onClose} className="min-h-11 rounded-full border border-on-paper/30 px-4 text-sm">
            Close
          </button>
        </div>
        <div className="mt-3 overflow-y-auto px-5 pb-6">
          <ol className="space-y-4">
            {helpPanels(values).map((p, index) => (
              <li key={p.id} className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2 border-t border-rule pt-3 first:border-t-0 first:pt-0">
                <span className="font-sign text-lg leading-none text-rope">{index + 1}</span>
                <span>
                  <span className="block font-sign text-lg leading-none">{p.title}</span>
                  {p.lines.map((line) => (
                    <span key={line} className="mt-1.5 block text-sm leading-relaxed text-on-paper/80">{line}</span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-x-5 border-t border-rule pt-3 text-sm">
            <Link href="/frames/how-it-works" prefetch={false} className="inline-flex min-h-11 items-center underline decoration-on-paper/30">
              How it works
            </Link>
            <Link href="/frames/fame" prefetch={false} className="inline-flex min-h-11 items-center underline decoration-on-paper/30">
              Hall of fame
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
