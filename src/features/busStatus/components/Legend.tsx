/** What the squares on the stop strips mean. */
export function Legend() {
  const item = 'inline-flex items-center gap-1.5'
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-[18px] gap-y-1.5 p-0 text-[12.5px] text-ink-soft">
      <li className={item}>
        <span aria-hidden="true" className="size-3 bg-canal" />
        Stop done
      </li>
      <li className={item}>
        <span aria-hidden="true" className="size-3 border-2 border-canal bg-panel" />
        Next stop
      </li>
      <li className={item}>
        <span aria-hidden="true" className="size-3 border-2 border-rule-mid bg-panel" />
        Later
      </li>
    </ul>
  )
}
