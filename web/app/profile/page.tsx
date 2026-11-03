export default function ProfilePage() {
  return (
    <main className="min-h-dvh bg-night px-4 pb-24 pt-8 text-chalk">
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk/50">Profile</p>
        <h1 className="mt-1 font-sign text-3xl leading-none">No account</h1>
        <p className="mt-2 text-sm text-chalk/60">A passkey on this device is what this page can read. None is stored.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat k="Streak" v="—" />
          <Stat k="Rank" v="—" />
          <Stat k="Tickets" v="—" />
        </div>

        <section className="mt-5 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">History</h2>
          <p className="mt-2 text-sm text-chalk/70">No raids are stored.</p>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-night-2 p-5">
          <h2 className="font-sign text-lg">Case notes</h2>
          <p className="mt-2 text-sm text-chalk/70">No notes are stored.</p>
        </section>
      </div>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-2 px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-chalk/45">{k}</div>
      <div className="mt-1 font-sign text-xl">{v}</div>
    </div>
  );
}
