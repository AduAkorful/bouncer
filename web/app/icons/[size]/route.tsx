import { appIcon } from "@/lib/app-icon";

const SIZES: Record<string, { px: number; maskable: boolean }> = {
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  "maskable-512": { px: 512, maskable: true },
};

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = SIZES[(await params).size];
  if (!size) return new Response("Not found", { status: 404 });
  return appIcon(size.px, size.maskable);
}
