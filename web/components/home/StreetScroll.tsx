import type { ReactNode } from "react";

const PLACE = `(function(){var el=document.currentScript&&document.currentScript.previousElementSibling;if(!el||!el.classList.contains("street-scroll"))return;var i=0;function place(){var n=(el.scrollWidth-el.clientWidth)/2;if(n>0){el.scrollLeft=n;return;}i+=1;if(i<12)requestAnimationFrame(place);}place();})();`;

/** A wide street in a short frame. The first view sits on the door. Phones swipe out to the stall and the shop. */
export function StreetScroll({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="street-scroll absolute inset-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
        <div className="relative h-full w-[240%] min-w-[880px] lg:w-full">{children}</div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: PLACE }} />
    </>
  );
}
