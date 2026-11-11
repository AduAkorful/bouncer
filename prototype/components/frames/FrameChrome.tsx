"use client";

import { useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FrameNav } from "@/components/FrameNav";
import { holdCapture } from "@/lib/capture";

/** Seeks or freezes the timelines already on the page, then lists every frame state. */
export function FrameChrome() {
  const path = usePathname();
  const search = useSearchParams();
  useLayoutEffect(() => {
    holdCapture();
  }, [path, search]);
  const current = path.startsWith("/frames/") ? path.slice("/frames/".length).split("/")[0] || "index" : "index";
  return <FrameNav current={current || "index"} />;
}
