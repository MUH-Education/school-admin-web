import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { EnquiryPrefill } from '@/features/enquiries/types'
import { Button } from '@/ui/Button'
import { LoadingBlock } from '@/ui/LoadingBlock'

/** The blue box "Started from the enquiry of …", with its loading and error states. */
export function EnquiryNotice({
  enquiryId,
  prefill,
}: {
  enquiryId: number
  prefill: UseQueryResult<EnquiryPrefill>
}) {
  if (prefill.isPending) return <LoadingBlock label="Loading the enquiry…" />
  if (prefill.isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border border-bad bg-bad-soft px-5 py-3.5 text-[15px]"
      >
        <span className="font-semibold text-bad">
          The enquiry could not be loaded. You can fill the form by hand.
        </span>
        <Button variant="plain" onClick={() => void prefill.refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  const e = prefill.data
  return (
    <section
      aria-label="Started from an enquiry"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border border-canal bg-canal-soft px-5 py-3.5 text-[15px]"
    >
      <div>
        Started from the enquiry of <strong>{e.parentName}</strong>, {e.village}, Class{' '}
        {e.className.replace(/^Class /, '')}. The known details are already filled in.
      </div>
      <Link to={`/enquiries/${enquiryId}`} className="font-semibold text-canal underline">
        View enquiry
      </Link>
    </section>
  )
}
