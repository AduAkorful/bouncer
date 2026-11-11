import { QueryPage } from "@/components/frames/QueryPage";
import { Creator } from "@/components/creator/Creator";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <Creator savedStart={query.state === "saved"} />} />;
}
