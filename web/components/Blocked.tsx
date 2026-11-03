export function Blocked({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="min-h-dvh bg-night px-4 py-16 text-chalk">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-night-2 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Unavailable</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">{title}</h1>
        <p className="mt-3 text-sm text-chalk/70">{detail}</p>
      </div>
    </main>
  );
}
