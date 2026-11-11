import { QueryPage } from "@/components/frames/QueryPage";
import { ShareFrame } from "@/components/frames/ShareFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <ShareFrame query={query} />} />;
}
