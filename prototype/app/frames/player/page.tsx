import { QueryPage } from "@/components/frames/QueryPage";
import { PlayerFrame } from "@/components/frames/PeopleFrames";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <PlayerFrame query={query} />} />;
}
