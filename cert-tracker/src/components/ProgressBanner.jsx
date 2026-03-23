export default function ProgressBanner({ percent, targetDate }) {
  if (!targetDate && percent === null) return null

  let daysInfo = null
  if (targetDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(targetDate)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    if (diff > 0) {
      daysInfo = `${diff} day${diff !== 1 ? 's' : ''} remaining`
    } else if (diff === 0) {
      daysInfo = 'Today is the target date!'
    } else {
      daysInfo = `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`
    }
  }

  const pct = percent ?? 0

  return (
    <div className="progress-banner">
      <span className="progress-pct">{pct}%</span>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {daysInfo && <span className="progress-days">{daysInfo}</span>}
      {targetDate && (
        <span className="progress-target">
          🎯 {new Date(targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )}
    </div>
  )
}
