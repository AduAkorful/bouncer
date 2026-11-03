/** Velvet rope between two brass posts: the threshold motif on stage screens. */
export function Rope({ open = false, className = "" }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 400 70" className={`w-full ${className}`} aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="brass" x1="0" x2="1">
          <stop offset="0" stopColor="#8a6a2a" />
          <stop offset=".5" stopColor="#f0d48f" />
          <stop offset="1" stopColor="#8a6a2a" />
        </linearGradient>
        <linearGradient id="velvet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d23a52" />
          <stop offset="1" stopColor="#6e1222" />
        </linearGradient>
      </defs>
      {open ? (
        <path d="M22,16 C24,48 34,64 70,65 C110,66 130,62 150,64" stroke="url(#velvet)" strokeWidth="7" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M22,16 C140,62 260,62 378,16" stroke="url(#velvet)" strokeWidth="7" fill="none" strokeLinecap="round" />
      )}
      <rect x="14" y="10" width="16" height="60" rx="3" fill="url(#brass)" />
      <rect x="370" y="10" width="16" height="60" rx="3" fill="url(#brass)" />
      <circle cx="22" cy="10" r="8" fill="url(#brass)" />
      <circle cx="378" cy="10" r="8" fill="url(#brass)" />
    </svg>
  );
}
