import { QueryPage } from "@/components/frames/QueryPage";
import { RaidFrame } from "@/components/frames/RaidFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <RaidFrame query={query} />} />;
}
