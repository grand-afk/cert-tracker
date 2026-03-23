import { useState, useMemo } from 'react'
import { daysUntilDue, dueLabel } from '../utils/sm2'
import RateButtons from './RateButtons'
import ResourceTooltip from './ResourceTooltip'
import EditResourceModal from './EditResourceModal'

const PAGE_SIZE = 20

export default function StudyView({
  topics,
  selectedCourses,
  getStatus,
  getSm2Card,
  rateCard,
  getLastUpdated,
  updateTopicResources,
}) {
  const [ratedIds, setRatedIds]     = useState({})   // id → quality just rated
  const [editTarget, setEditTarget] = useState(null)
  const [page, setPage]             = useState(1)
  const [showDueOnly, setShowDueOnly] = useState(true)
  const [sort, setSort]             = useState({ key: 'due', dir: 'asc' })

  // Filter by course
  const filtered = useMemo(() => {
    if (!selectedCourses.length) return topics
    return topics.filter((t) => selectedCourses.includes(t.courseId))
  }, [topics, selectedCourses])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv
      if (sort.key === 'course') {
        av = a.courseName; bv = b.courseName
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      if (sort.key === 'topic') {
        av = a.name; bv = b.name
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      // Default: sort by due date (ascending = most overdue first)
      const da = daysUntilDue(getSm2Card(a.id))
      const db = daysUntilDue(getSm2Card(b.id))
      return sort.dir === 'asc' ? da - db : db - da
    })
  }, [filtered, sort, getSm2Card])

  const dueItems  = sorted.filter((t) => daysUntilDue(getSm2Card(t.id)) <= 0)
  const displayed = showDueOnly ? sorted.filter((t) => daysUntilDue(getSm2Card(t.id)) <= 0) : sorted

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = displayed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleRate(id, quality) {
    rateCard(id, quality)
    setRatedIds((p) => ({ ...p, [id]: quality }))
  }

  function toggleSort(key) {
    setPage(1)
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  function SortTh({ colKey, children, style }) {
    const active = sort.key === colKey
    return (
      <th style={style} className={active ? 'sort-active' : ''}
          onClick={() => toggleSort(colKey)}
          title={`Sort by ${children}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSort(colKey)}>
        {children}
        <span className="sort-arrow">{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </th>
    )
  }

  function dueBadgeClass(card) {
    const d = daysUntilDue(card)
    if (d === -Infinity || d <= 0) return 'due-badge--overdue'
    if (d <= 3) return 'due-badge--soon'
    return 'due-badge--ok'
  }

  return (
    <div className="study-view">
      <div className="study-header">
        <h2 className="study-title">🎓 Study</h2>
        <div className="study-header-right">
          <span className="study-count">{dueItems.length} due</span>
          {/* "Due only" is highlighted when the filter IS active — consistent with course chips */}
          <button
            className={`btn btn-secondary btn-sm ${showDueOnly ? 'btn-active' : ''}`}
            onClick={() => { setShowDueOnly((v) => !v); setPage(1) }}
          >
            {showDueOnly ? `Due only` : `Show all (${sorted.length})`}
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">🎉</p>
          <h2>All caught up!</h2>
          <p>No topics are due for review right now.</p>
          <button className="btn btn-secondary" onClick={() => { setShowDueOnly(false); setPage(1) }}>
            Show all topics
          </button>
        </div>
      ) : (
        <>
          <div className="study-table-wrapper">
            <table className="study-table">
              <thead>
                <tr>
                  <SortTh colKey="course" style={{ width: 130 }}>Course</SortTh>
                  <SortTh colKey="topic">Topic</SortTh>
                  <SortTh colKey="due" style={{ width: 110 }}>Due</SortTh>
                  <th style={{ width: 260 }}>Rate</th>
                  <th className="study-cell--resources">Resources</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((topic) => {
                  const card        = getSm2Card(topic.id)
                  const lastQuality = card?.lastQuality ?? null
                  const rated       = ratedIds[topic.id] !== undefined
                  return (
                    <tr key={topic.id} className={`study-row ${rated ? 'study-row--rated' : ''}`}>
                      <td className="study-cell study-cell--course">
                        <span className="course-badge">
                          <span className="course-badge__dot" style={{ background: topic.courseColor }} />
                          {topic.courseName}
                        </span>
                      </td>
                      <td className="study-cell study-cell--topic">{topic.name}</td>
                      <td className="study-cell">
                        <span className={`due-badge ${dueBadgeClass(card)}`}>
                          {dueLabel(card)}
                        </span>
                      </td>
                      <td className="study-cell">
                        <RateButtons
                          onRate={(q) => handleRate(topic.id, q)}
                          card={card}
                          lastQuality={ratedIds[topic.id] !== undefined ? ratedIds[topic.id] : lastQuality}
                        />
                      </td>
                      <td className="study-cell study-cell--resources">
                        <ResourceTooltip
                          resources={topic.resources}
                          topicName={topic.name}
                          onEdit={() => setEditTarget(topic)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>← Prev</button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`page-num ${p === safePage ? 'page-num--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
              </div>
              <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}

      {editTarget && (
        <EditResourceModal
          title={`${editTarget.courseName} › ${editTarget.name}`}
          resources={editTarget.resources}
          onSave={(res) => updateTopicResources(editTarget.id, res)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
