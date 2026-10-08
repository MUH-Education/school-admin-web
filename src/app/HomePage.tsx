export function HomePage() {
  return (
    <main className="px-10 pt-8 pb-14">
      <p className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">Start</p>
      <h1 className="border-b-2 border-ink pb-3 text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">
        School admin
      </h1>
      <section className="mt-6 max-w-md border border-rule bg-panel p-6">
        <h2 className="text-[17px] font-semibold">Students on buses</h2>
        <p className="mt-2 font-mono text-2xl font-semibold">255</p>
        <p className="mt-1 text-[13px] text-ink-soft">Sample number, in the mono font.</p>
        <button type="button" className="mt-4 h-11 bg-canal px-5 font-semibold text-white">
          Primary button
        </button>
      </section>
    </main>
  )
}
