import { Suspense, type ReactNode } from "react";
import { queryObject, type Query } from "@/lib/demo/query";

export function QueryPage({ searchParams, render }: { searchParams: Promise<Query>; render: (query: Record<string, string>) => ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-night" />}>
      <Body searchParams={searchParams} render={render} />
    </Suspense>
  );
}

async function Body({ searchParams, render }: { searchParams: Promise<Query>; render: (query: Record<string, string>) => ReactNode }) {
  return render(queryObject(await searchParams));
}
