import { useTranslation } from 'react-i18next'
import { useTrip } from '../TripContext'

/**
 * "नया वर्ज़न आ गया · अभी लें". Shown when a new version of the app is waiting. It never reloads
 * by itself: a reload in the middle of a trip must be the attendant's choice.
 */
export function UpdateBar() {
  const { t } = useTranslation()
  const { update } = useTrip()
  if (!update.available) return null
  return (
    <button
      type="button"
      onClick={update.apply}
      style={{ minHeight: 44 }}
      className="w-full flex-none cursor-pointer border-b border-canal bg-canal-soft px-4 py-2 text-left text-[15.5px] font-semibold text-ink"
    >
      {t('update.text')}
    </button>
  )
}
