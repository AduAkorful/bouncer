export function Quiet({ kicker, title, detail }: { kicker: string; title: string; detail: string }) {
  return (
    <main className="min-h-dvh bg-night px-4 py-16 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">{kicker}</p>
        <h1 className="mt-2 font-sign text-3xl leading-tight">{title}</h1>
        <p className="mt-3 text-sm text-chalk/70">{detail}</p>
      </div>
    </main>
  );
}
