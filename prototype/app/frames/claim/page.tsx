import { QueryPage } from "@/components/frames/QueryPage";
import { ClaimFrame } from "@/components/frames/ClaimFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <ClaimFrame query={query} />} />;
}
