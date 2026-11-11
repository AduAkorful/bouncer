import { QueryPage } from "@/components/frames/QueryPage";
import { SponsorFrame } from "@/components/frames/SponsorFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <SponsorFrame query={query} />} />;
}
