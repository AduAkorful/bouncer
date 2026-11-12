import { QueryPage } from "@/components/frames/QueryPage";
import { WinsFrame } from "@/components/frames/WinsFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <WinsFrame query={query} />} />;
}
