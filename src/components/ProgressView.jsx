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

export default function ProgressView({
  allItems,
  courses,
  getStatus,
  getSm2Card,
  selectedCourses,
  toggleCourse,
  clearSelectedCourses,
  dashFilter,
  setDashFilter,
  setView,
  onEditSubtopic,
}) {
  // ── By Course ──────────────────────────────────────────────────────────────
  const byCourse = useMemo(() => {
    const counts = {}
    allItems.forEach((t) => {
      counts[t.courseId] = (counts[t.courseId] || 0) + 1
    })
    return courses.map((c) => ({
      key: c.id,
      label: c.name,
      value: counts[c.id] || 0,
      color: c.color || '#6b7280',
    })).filter((s) => s.value > 0)
  }, [allItems, courses])

  // ── By Status ──────────────────────────────────────────────────────────────
  const byStatus = useMemo(() => {
    const counts = { 'not-started': 0, 'in-progress': 0, 'complete': 0 }
    allItems.forEach((t) => {
      const s = getStatus(t.id)
      if (counts[s] !== undefined) counts[s]++
    })
    return STATUS_META.map((m) => ({ ...m, value: counts[m.key] }))
  }, [allItems, getStatus])

  // ── By Rating ──────────────────────────────────────────────────────────────
  const byRating = useMemo(() => {
    const counts = { again: 0, hard: 0, good: 0, easy: 0, 'not-rated': 0 }
    allItems.forEach((t) => {
      const card = getSm2Card(t.id)
      const q = card?.lastQuality ?? null
      if (q === 0) counts.again++
      else if (q === 3) counts.hard++
      else if (q === 4) counts.good++
      else if (q === 5) counts.easy++
      else counts['not-rated']++
    })
    return RATING_META.map((m) => ({ ...m, value: counts[m.key] }))
  }, [allItems, getSm2Card])

  // ── By Due ─────────────────────────────────────────────────────────────────
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

  // ── Recently Studied ───────────────────────────────────────────────────────
  const recentlyStudied = useMemo(() => {
    return allItems
      .map((t) => {
        const card = getSm2Card(t.id)
        if (!card?.lastRated) return null
        return {
          ...t,
          lastRated: card.lastRated,
          lastQuality: card.lastQuality ?? null,
          courseColor: t.courseColor,
          courseName: t.courseName,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.lastRated.localeCompare(a.lastRated))
      .slice(0, 5)
  }, [allItems, getSm2Card])

  // ── Up Next ────────────────────────────────────────────────────────────────
  const upNext = useMemo(() => {
    return allItems
      .map((t) => {
        const card = getSm2Card(t.id)
        if (!card?.nextReview) return null
        const days = daysUntilDue(card)
        const isOverdue = days < 0
        return {
          ...t,
          nextReview: card.nextReview,
          isOverdue,
          dueLabel: dueLabel(card),
          courseColor: t.courseColor,
          courseName: t.courseName,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
      .slice(0, 5)
  }, [allItems, getSm2Card])

  // ── Active keys ────────────────────────────────────────────────────────────
  const activeCourseKey = selectedCourses.length === 1 ? selectedCourses[0] : null
  const activeStatusKey = dashFilter?.type === 'status' ? dashFilter.value : null
  const activeRatingKey = dashFilter?.type === 'rating' ? dashFilter.value : null
  const activeDueKey    = dashFilter?.type === 'due'    ? dashFilter.value : null

  // ── Click handlers ─────────────────────────────────────────────────────────
  function handleCourseClick(key) {
    if (key === null) {
      clearSelectedCourses()
    } else {
      clearSelectedCourses()
      toggleCourse(key)
    }
    setView('topics')
  }

  function handleStatusClick(key) {
    if (key === null || (dashFilter?.type === 'status' && dashFilter.value === key)) {
      setDashFilter(null)
    } else {
      setDashFilter({ type: 'status', value: key })
    }
    setView('topics')
  }

  function handleRatingClick(key) {
    if (key === null || (dashFilter?.type === 'rating' && dashFilter.value === key)) {
      setDashFilter(null)
    } else {
      setDashFilter({ type: 'rating', value: key })
    }
    setView('study')
  }

  function handleDueClick(key) {
    if (key === null || (dashFilter?.type === 'due' && dashFilter.value === key)) {
      setDashFilter(null)
    } else {
      setDashFilter({ type: 'due', value: key })
    }
    setView('study')
  }

  return (
    <div className="progress-view">
      <div className="progress-charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">By Course</h3>
          <DonutChart
            slices={byCourse}
            activeKey={activeCourseKey}
            onSliceClick={handleCourseClick}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">By Status</h3>
          <DonutChart
            slices={byStatus}
            activeKey={activeStatusKey}
            onSliceClick={handleStatusClick}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">By Rating</h3>
          <DonutChart
            slices={byRating}
            activeKey={activeRatingKey}
            onSliceClick={handleRatingClick}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">By Due Date</h3>
          <DonutChart
            slices={byDue}
            activeKey={activeDueKey}
            onSliceClick={handleDueClick}
          />
        </div>
      </div>

      {dashFilter && (
        <div className="dash-filter-badge">
          Filtered: {dashFilter.type} · {dashFilter.value}
          <button className="icon-btn" onClick={() => setDashFilter(null)}>✕</button>
        </div>
      )}

      <div className="progress-tables-grid">
        {/* Recently Studied */}
        <section className="progress-table-section">
          <h3 className="progress-table-title">Recently Studied</h3>
          {recentlyStudied.length === 0 ? (
            <p className="text-muted">No reviews yet.</p>
          ) : (
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Course</th>
                  <th>Last Review</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {recentlyStudied.map((t) => (
                  <tr
                    key={t.id}
                    className="progress-table-row"
                    onClick={() => onEditSubtopic?.(t.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{t.name}</td>
                    <td>
                      <span className="course-badge">
                        <span className="course-badge__dot" style={{ background: t.courseColor }} />
                        {t.courseName}
                      </span>
                    </td>
                    <td>{relTime(t.lastRated)}</td>
                    <td>
                      <span style={{ color: RATING_META.find((r) => r.quality === t.lastQuality)?.color }}>
                        {RATING_META.find((r) => r.quality === t.lastQuality)?.label ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Up Next */}
        <section className="progress-table-section">
          <h3 className="progress-table-title">Up Next</h3>
          {upNext.length === 0 ? (
            <p className="text-muted">No upcoming reviews.</p>
          ) : (
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Course</th>
                  <th>Next Review</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {upNext.map((t) => (
                  <tr
                    key={t.id}
                    className="progress-table-row"
                    onClick={() => onEditSubtopic?.(t.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{t.name}</td>
                    <td>
                      <span className="course-badge">
                        <span className="course-badge__dot" style={{ background: t.courseColor }} />
                        {t.courseName}
                      </span>
                    </td>
                    <td>{t.nextReview}</td>
                    <td>
                      <span className={t.isOverdue ? 'due-badge due-badge--overdue' : 'due-badge'}>
                        {t.dueLabel}
                      </span>
                    </td>
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
