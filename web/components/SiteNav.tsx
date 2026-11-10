import Link from "next/link";

/** The bar on pages away from the door, so every page has a way to the doors, the board, and the profile (QA R20 N-13). */
export function SiteNav() {
  const link = "chalk-focus inline-flex min-h-11 items-center px-2 text-sm text-chalk/80 hover:text-chalk";
  return (
    <nav aria-label="Site" className="-mx-4 -mt-8 mb-6 flex items-center justify-between gap-2 border-b border-white/10 px-4 py-1">
      <Link href="/" prefetch={false} className="chalk-focus inline-flex min-h-11 items-center font-sign text-lg tracking-wide">
        BOUNCER
      </Link>
      <div className="flex flex-wrap items-center justify-end">
        <Link href="/home" prefetch={false} className={link}>Doors</Link>
        <Link href="/fame" prefetch={false} className={link}>Hall of fame</Link>
        <Link href="/profile" prefetch={false} className={link}>Profile</Link>
      </div>
    </nav>
  );
}
