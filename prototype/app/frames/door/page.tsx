import { QueryPage } from "@/components/frames/QueryPage";
import { DoorFrame } from "@/components/frames/DoorFrame";
import type { Query } from "@/lib/demo/query";

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <QueryPage searchParams={searchParams} render={(query) => <DoorFrame mode="door" query={query} />} />;
}
