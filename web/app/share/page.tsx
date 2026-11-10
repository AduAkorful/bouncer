import { screen } from "@/lib/screen";
import { SiteNav } from "@/components/SiteNav";
import { LastNight } from "@/components/share/LastNight";

export const metadata = screen("Your night", "The last raid on this browser, ready to share.", { index: false });

export default function Page() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <SiteNav />
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk/80">Share</p>
        <LastNight storageName={process.env.NEXT_PUBLIC_STORAGE_NAME ?? ""} />
      </div>
    </main>
  );
}
