"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { StreetBar } from "@/components/home/StreetBar";

const PLACE = `(function(){var el=document.currentScript&&document.currentScript.previousElementSibling;if(!el||!el.classList.contains("street-scroll"))return;var i=0;function place(){var n=(el.scrollWidth-el.clientWidth)/2;if(n>0){el.scrollLeft=n;return;}i+=1;if(i<12)requestAnimationFrame(place);}place();})();`;

/** A wide street in a short frame. The first view sits on the door. Phones swipe out to the stall and the shop. */
export function StreetScroll({ children, bar = false }: { children: ReactNode; bar?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  // The inline script centres the street before paint on a full load. React does not run it after a
  // client-side navigation, and it can measure before the layout settles, so the street opened at its left edge.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    let tries = 0;
    const centre = () => {
      const room = (el.scrollWidth - el.clientWidth) / 2;
      if (room > 0) {
        if (el.scrollLeft === 0) el.scrollLeft = room;
        return;
      }
      if (++tries < 30) frame = requestAnimationFrame(centre);
    };
    centre();
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <>
      {/* One named Tab stop, so arrow keys can scroll it and a screen reader hears a short name, not every painted word. */}
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="The street. Scroll sideways to see it."
        className="street-scroll chalk-focus absolute inset-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
      >
        <div className="relative h-full w-[240%] min-w-[880px] lg:w-full">{children}</div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: PLACE }} />
      {bar ? <StreetBar scroller={scroller} /> : null}
    </>
  );
}
