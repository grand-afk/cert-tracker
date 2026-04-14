import { useMemo } from 'react'
import DonutChart from './DonutChart'
import { daysUntilDue, dueLabel } from '../utils/sm2'

const STATUS_META = [
  { key: 'not-started', label: 'Not Started', color: '#6b7280' },
  { key: 'in-progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'complete',    label: 'Complete',    color: '#10b981' },
]

const RATING_META = [
  { key: 'again',     label: 'Again',     quality: 0,    color: '#ef4444' },
  { key: 'hard',      label: 'Hard',      quality: 3,    color: '#f59e0b' },
  { key: 'good',      label: 'Good',      quality: 4,    color: '#10b981' },
  { key: 'easy',      label: 'Easy',      quality: 5,    color: '#3b82f6' },
  { key: 'not-rated', label: 'Not Rated', quality: null, color: '#6b7280' },
]

const DUE_META = [
  { key: 'overdue', label: 'Overdue',     color: '#ef4444' },
  { key: 'today',   label: 'Due Today',   color: '#f59e0b' },
  { key: 'week',    label: 'This Week',   color: '#10b981' },
  { key: 'later',   label: 'Later',       color: '#3b82f6' },
  { key: 'none',    label: 'No Due Date', color: '#6b7280' },
]

function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(Math.abs(diff) / 86400000)
  if (d === 0) return 'Today'
  if (diff > 0) return d === 1 ? 'Yesterday' : `${d}d ago`
  return d === 1 ? 'Tomorrow' : `In ${d}d`
}

// Apply dashFilters + selectedCourses to a list of enriched items
function applyFilters(items, dashFilters, selectedCourses, getStatus, getSm2Card) {
  let result = items
  if (selectedCourses.length) {
    result = result.filter((t) => selectedCourses.includes(t.courseId))
  }
  if (dashFilters.status) {
    result = result.filter((t) => getStatus(t.id) === dashFilters.status)
  }
  if (dashFilters.rating) {
    const QUALITY_MAP = { again: 0, hard: 3, good: 4, easy: 5 }
    result = result.filter((t) => {
      const q = getSm2Card(t.id)?.lastQuality ?? null
      return dashFilters.rating === 'not-rated' ? q == null : q === QUALITY_MAP[dashFilters.rating]
    })
  }
  if (dashFilters.due) {
    result = result.filter((t) => {
      const card = getSm2Card(t.id)
      if (dashFilters.due === 'none') return !card?.nextReview
      const days = daysUntilDue(card)
      if (dashFilters.due === 'overdue') return days < 0
      if (dashFilters.due === 'today')   return days === 0
      if (dashFilters.due === 'week')    return days > 0 && days <= 7
      if (dashFilters.due === 'later')   return days > 7
      return true
    })
  }
  return result
}

export default function ProgressView({
  allItems,
  courses,
  getStatus,
  getSm2Card,
  selectedCourses,
  toggleCourse,
  clearSelectedCourses,
  dashFilters = {},
  setDashFilters,
  onEditSubtopic,
}) {
  // ── Chart data ─────────────────────────────────────────────────────────────
  const byCourse = useMemo(() => {
    const counts = {}
    allItems.forEach((t) => { counts[t.courseId] = (counts[t.courseId] || 0) + 1 })
    return courses
      .map((c) => ({ key: c.id, label: c.name, value: counts[c.id] || 0, color: c.color || '#6b7280' }))
      .filter((s) => s.value > 0)
  }, [allItems, courses])

  const byStatus = useMemo(() => {
    const counts = { 'not-started': 0, 'in-progress': 0, 'complete': 0 }
    allItems.forEach((t) => { const s = getStatus(t.id); if (counts[s] !== undefined) counts[s]++ })
    return STATUS_META.map((m) => ({ ...m, value: counts[m.key] }))
  }, [allItems, getStatus])

  const byRating = useMemo(() => {
    const counts = { again: 0, hard: 0, good: 0, easy: 0, 'not-rated': 0 }
    allItems.forEach((t) => {
      const q = getSm2Card(t.id)?.lastQuality ?? null
      if (q === 0) counts.again++
      else if (q === 3) counts.hard++
      else if (q === 4) counts.good++
      else if (q === 5) counts.easy++
      else counts['not-rated']++
    })
    return RATING_META.map((m) => ({ ...m, value: counts[m.key] }))
  }, [allItems, getSm2Card])

  const byDue = useMemo(() => {
    const counts = { overdue: 0, today: 0, week: 0, later: 0, none: 0 }
    allItems.forEach((t) => {
      const card = getSm2Card(t.id)
      if (!card?.nextReview) { counts.none++; return }
      const days = daysUntilDue(card)
      if (days < 0) counts.overdue++
      else if (days === 0) counts.today++
      else if (days <= 7) counts.week++
      else counts.later++
    })
    return DUE_META.map((m) => ({ ...m, value: counts[m.key] }))
  }, [allItems, getSm2Card])

  // ── Filtered items for tables ───────────────────────────────────────────────
  const filteredItems = useMemo(
    () => applyFilters(allItems, dashFilters, selectedCourses, getStatus, getSm2Card),
    [allItems, dashFilters, selectedCourses, getStatus, getSm2Card]
  )

  const recentlyStudied = useMemo(() => {
    return filteredItems
      .map((t) => { const card = getSm2Card(t.id); if (!card?.lastRated) return null; return { ...t, lastRated: card.lastRated, lastQuality: card.lastQuality ?? null } })
      .filter(Boolean)
      .sort((a, b) => b.lastRated.localeCompare(a.lastRated))
      .slice(0, 5)
  }, [filteredItems, getSm2Card])

  const upNext = useMemo(() => {
    return filteredItems
      .map((t) => { const card = getSm2Card(t.id); if (!card?.nextReview) return null; return { ...t, nextReview: card.nextReview, isOverdue: daysUntilDue(card) < 0, dueLabel: dueLabel(card) } })
      .filter(Boolean)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
      .slice(0, 5)
  }, [filteredItems, getSm2Card])

  // ── Active keys for charts ─────────────────────────────────────────────────
  const activeCourseKey = selectedCourses.length === 1 ? selectedCourses[0] : null
  const activeStatusKey = dashFilters.status ?? null
  const activeRatingKey = dashFilters.rating ?? null
  const activeDueKey    = dashFilters.due    ?? null

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  function toggleDashFilter(type, value) {
    setDashFilters((prev) => {
      if (prev[type] === value) {
        const { [type]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [type]: value }
    })
  }

  function removeDashFilter(type) {
    setDashFilters((prev) => { const { [type]: _, ...rest } = prev; return rest })
  }

  function handleCourseClick(key) {
    if (!key || (selectedCourses.length === 1 && selectedCourses[0] === key)) {
      clearSelectedCourses()
    } else {
      clearSelectedCourses()
      toggleCourse(key)
    }
  }

  // ── Active filter badges ───────────────────────────────────────────────────
  const activeBadges = [
    ...selectedCourses.map((cid) => {
      const c = courses.find((c) => c.id === cid)
      return { id: `course-${cid}`, label: `Course: ${c?.name ?? cid}`, color: c?.color, onRemove: () => toggleCourse(cid) }
    }),
    ...(dashFilters.status ? [{ id: 'status', label: `Status: ${STATUS_META.find(m => m.key === dashFilters.status)?.label ?? dashFilters.status}`, onRemove: () => removeDashFilter('status') }] : []),
    ...(dashFilters.rating ? [{ id: 'rating', label: `Rating: ${RATING_META.find(m => m.key === dashFilters.rating)?.label ?? dashFilters.rating}`, onRemove: () => removeDashFilter('rating') }] : []),
    ...(dashFilters.due    ? [{ id: 'due',    label: `Due: ${DUE_META.find(m => m.key === dashFilters.due)?.label ?? dashFilters.due}`,             onRemove: () => removeDashFilter('due') }]    : []),
  ]

  return (
    <div className="progress-view">
      {/* Charts */}
      <div className="progress-charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">By Course</h3>
          <DonutChart slices={byCourse} activeKey={activeCourseKey} onSliceClick={handleCourseClick} />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">By Status</h3>
          <DonutChart slices={byStatus} activeKey={activeStatusKey} onSliceClick={(k) => toggleDashFilter('status', k)} />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">By Rating</h3>
          <DonutChart slices={byRating} activeKey={activeRatingKey} onSliceClick={(k) => toggleDashFilter('rating', k)} />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">By Due Date</h3>
          <DonutChart slices={byDue} activeKey={activeDueKey} onSliceClick={(k) => toggleDashFilter('due', k)} />
        </div>
      </div>

      {/* Active filter badges */}
      {activeBadges.length > 0 && (
        <div className="dash-filter-bar">
          {activeBadges.map((b) => (
            <div key={b.id} className="dash-filter-badge">
              {b.color && <span className="dash-filter-dot" style={{ background: b.color }} />}
              {b.label}
              <button className="icon-btn dash-filter-remove" onClick={b.onRemove} title="Remove filter">✕</button>
            </div>
          ))}
          {activeBadges.length > 1 && (
            <button className="btn btn-secondary btn-sm" onClick={() => { clearSelectedCourses(); setDashFilters({}) }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Tables */}
      <div className="progress-tables-grid">
        <section className="progress-table-section">
          <h3 className="progress-table-title">Recently Studied</h3>
          {recentlyStudied.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>No reviews yet{activeBadges.length ? ' for these filters' : ''}.</p>
          ) : (
            <table className="progress-table">
              <thead><tr><th>Topic</th><th>Course</th><th>Last Review</th><th>Rating</th></tr></thead>
              <tbody>
                {recentlyStudied.map((t) => {
                  const ratingMeta = RATING_META.find((r) => r.quality === t.lastQuality)
                  return (
                    <tr key={t.id} className="progress-table-row" onClick={() => onEditSubtopic?.(t.id)} style={{ cursor: 'pointer' }}>
                      <td>{t.name}</td>
                      <td><span className="course-badge"><span className="course-badge__dot" style={{ background: t.courseColor }} />{t.courseName}</span></td>
                      <td>{relTime(t.lastRated)}</td>
                      <td><span style={{ color: ratingMeta?.color }}>{ratingMeta?.label ?? '—'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="progress-table-section">
          <h3 className="progress-table-title">Up Next</h3>
          {upNext.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>No upcoming reviews{activeBadges.length ? ' for these filters' : ''}.</p>
          ) : (
            <table className="progress-table">
              <thead><tr><th>Topic</th><th>Course</th><th>Next Review</th><th>Due</th></tr></thead>
              <tbody>
                {upNext.map((t) => (
                  <tr key={t.id} className="progress-table-row" onClick={() => onEditSubtopic?.(t.id)} style={{ cursor: 'pointer' }}>
                    <td>{t.name}</td>
                    <td><span className="course-badge"><span className="course-badge__dot" style={{ background: t.courseColor }} />{t.courseName}</span></td>
                    <td>{t.nextReview}</td>
                    <td><span className={t.isOverdue ? 'due-badge due-badge--overdue' : 'due-badge'}>{t.dueLabel}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
