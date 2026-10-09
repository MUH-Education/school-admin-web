interface Example {
  name: string
  role: string
  items: { label: string; current?: boolean }[]
  note: string
}

/** Fixed text, as in the design. */
const examples: Example[] = [
  {
    name: 'Priya',
    role: 'Admissions desk',
    items: [
      { label: 'Enquiries', current: true },
      { label: 'New admission' },
      { label: 'Students (view only)' },
      { label: 'Analytics (view only)' },
    ],
    note: 'No transport pages. No user settings.',
  },
  {
    name: 'Jaswant',
    role: 'Transport in-charge',
    items: [
      { label: 'Bus status', current: true },
      { label: 'Routes and load' },
      { label: 'Vehicles and staff' },
      { label: 'Students' },
      { label: 'Messages' },
    ],
    note: 'No enquiries. No family or fee data.',
  },
  {
    name: 'Balwan',
    role: 'Attendant · Route 4',
    items: [{ label: 'Trip screen for Route 4', current: true }],
    note: 'Phone only. Cannot open this web app. Cannot see Route 7.',
  },
]

export function MenuExamples() {
  return (
    <section aria-label="Menu examples" className="flex flex-col gap-2.5">
      <h2 className="text-[15px] font-semibold">Example: the menu each person sees after login</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
        {examples.map((example) => (
          <div key={example.name} className="flex flex-col gap-2.5 bg-ink p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-white">{example.name}</span>
              <span className="font-mono text-[11px] tracking-[0.08em] text-dust-light uppercase">
                {example.role}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {example.items.map((item) => (
                <li
                  key={item.label}
                  className={`px-2.5 py-[9px] text-[13.5px] ${item.current ? 'bg-canal font-semibold text-white' : 'text-side-text'}`}
                >
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-side-label">{example.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
