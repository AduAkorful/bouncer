import { QueryPage } from "@/components/frames/QueryPage";
import { StreetFrame } from "@/components/frames/StreetFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <StreetFrame query={query} />} />;
}
