import { Suspense, type ReactNode } from "react";
import { FrameChrome } from "@/components/frames/FrameChrome";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <FrameChrome />
      </Suspense>
    </>
  );
}
