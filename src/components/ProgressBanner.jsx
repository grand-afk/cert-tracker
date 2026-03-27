import { fmtDisplayDate } from '../utils/relativeTime'

// courseMilestones: [{ courseId, courseName, courseColor, latestDueDate }]
// Ticks are positioned proportionally on the time axis: today → targetDate
export default function ProgressBanner({ percent, targetDate, courseMilestones = [] }) {
  if (!targetDate && percent === null) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let daysInfo = null
  let targetMs = null
  if (targetDate) {
    const target = new Date(targetDate)
    target.setHours(0, 0, 0, 0)
    targetMs = target.getTime()
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

  // Only render ticks when we have a target date to position against
  const ticks = targetMs
    ? courseMilestones
        .filter((m) => m.latestDueDate)
        .map((m) => {
          const dueMs  = new Date(m.latestDueDate).getTime()
          const todayMs = today.getTime()
          const pos    = Math.round(((dueMs - todayMs) / (targetMs - todayMs)) * 100)
          return { ...m, pos }
        })
    : []

  return (
    <div className="progress-banner">
      <span className="progress-pct">{pct}%</span>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        {ticks.map((tick) => (
          <div
            key={tick.courseId}
            className="progress-milestone-tick"
            style={{
              left: `${Math.max(0, Math.min(100, tick.pos))}%`,
              background: tick.courseColor,
              opacity: tick.pos < 0 || tick.pos > 100 ? 0.4 : 1,
            }}
            title={`${tick.courseName}: last topic due ${fmtDisplayDate(tick.latestDueDate)}`}
          />
        ))}
      </div>
      {daysInfo && <span className="progress-days">{daysInfo}</span>}
      {targetDate && (
        <span className="progress-target">
          🎯 {fmtDisplayDate(targetDate)}
        </span>
      )}
    </div>
  )
}
