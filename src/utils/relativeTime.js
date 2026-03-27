const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * Formats a YYYY-MM-DD date string as DD-MMM-YY (e.g. "04-Apr-26").
 * Parses the string directly to avoid timezone shifts.
 * @param {string|null} iso - YYYY-MM-DD date string
 * @returns {string}
 */
export function fmtDisplayDate(iso) {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length < 3) return iso
  const [year, month, day] = parts.map(Number)
  return `${String(day).padStart(2, '0')}-${MONTHS_SHORT[month - 1]}-${String(year).slice(2)}`
}

/**
 * Returns a human-readable relative time string from an ISO timestamp.
 * @param {string|null} iso - ISO 8601 date string
 * @returns {string}
 */
export function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
