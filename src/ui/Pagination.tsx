import { Button } from './Button'

interface PaginationProps {
  /** First page is 1. */
  page: number
  pageSize: number
  total: number
  /** For the sentence: "Showing 1 to 25 of 290 students". */
  noun: string
  onPage: (page: number) => void
}

/** "Showing 26 to 50 of 290 students" with Back and Next. */
export function Pagination({ page, pageSize, total, noun, onPage }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return (
    <nav
      aria-label="Pages"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12.5px] text-ink-soft"
    >
      <p>
        Showing <span className="font-mono">{first}</span> to{' '}
        <span className="font-mono">{last}</span> of <span className="font-mono">{total}</span>{' '}
        {noun}.
      </p>
      <div className="flex items-center gap-2.5">
        <Button variant="plain" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Back
        </Button>
        <span className="font-mono text-[12.5px]">
          Page {page} of {pages}
        </span>
        <Button variant="plain" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
