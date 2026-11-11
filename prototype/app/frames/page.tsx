import { LINKS } from "@/lib/demo/frames";

export default function Page() {
  let group = "";
  return (
    <main className="min-h-dvh overflow-x-clip bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-chalk/80">Prototype</p>
        <h1 className="mt-2 font-sign text-3xl leading-none">Frames</h1>
        <p className="mt-3 text-sm text-chalk/70">Demo data only. Each link is a screen the app already has.</p>
        <ul className="mt-6 space-y-1">
          {LINKS.map((link) => {
            const head = link.group !== group;
            group = link.group;
            return (
              <li key={link.href}>
                {head ? <h2 className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-chalk/50">{link.group}</h2> : null}
                <a href={link.href} className="chalk-focus block py-1 text-sm underline decoration-white/20">{link.label}</a>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
