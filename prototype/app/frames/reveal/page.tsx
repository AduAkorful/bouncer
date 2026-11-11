import { QueryPage } from "@/components/frames/QueryPage";
import { RevealFrame } from "@/components/frames/RevealFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <RevealFrame query={query} />} />;
}
