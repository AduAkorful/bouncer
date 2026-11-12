import Link from "next/link";

/** The bar on pages away from the door, so every page has a way to the doors, the board, and the profile (QA R20 N-13). */
export function SiteNav() {
  const link = "chalk-focus inline-flex min-h-11 min-w-11 items-center justify-center px-1.5 text-[13px] text-chalk/80 hover:text-chalk sm:px-2 sm:text-sm";
  return (
    <nav aria-label="Site" className="-mx-4 -mt-8 mb-6 flex items-center justify-between gap-2 border-b border-white/10 px-4 py-1">
      <Link href="/frames/landing" prefetch={false} className="chalk-focus inline-flex min-h-11 items-center font-sign text-lg tracking-wide">
        BOUNCER
      </Link>
      <div className="flex flex-wrap items-center justify-end">
        <Link href="/frames/home" prefetch={false} className={link}>Doors</Link>
        <Link href="/frames/fame" prefetch={false} className={link}>Hall of fame</Link>
        <Link href="/frames/how-it-works" prefetch={false} className={link}><span className="sm:hidden">Help</span><span className="max-sm:hidden">How it works</span></Link>
        <Link href="/frames/profile" prefetch={false} className={link}>Profile</Link>
      </div>
    </nav>
  );
}
