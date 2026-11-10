import { screen } from "@/lib/screen";
import type { ReactNode } from "react";

export const metadata = screen("Bouncer studio", "Design a look. The look never changes a verdict.", { index: false });

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return children;
}
