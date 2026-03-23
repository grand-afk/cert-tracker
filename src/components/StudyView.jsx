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
  const [ratedIds, setRatedIds]   = useState({})   // id → quality just rated (for flash)
  const [editTarget, setEditTarget] = useState(null)
  const [page, setPage] = useState(1)
  const [showAll, setShowAll] = useState(false)

  // Filter by course
  const filtered = useMemo(() => {
    if (!selectedCourses.length) return topics
    return topics.filter((t) => selectedCourses.includes(t.courseId))
  }, [topics, selectedCourses])

  // Sort: overdue / new first, then by days until due ascending
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = daysUntilDue(getSm2Card(a.id))
      const db = daysUntilDue(getSm2Card(b.id))
      return da - db
    })
  }, [filtered, getSm2Card])

  const dueItems   = sorted.filter((t) => daysUntilDue(getSm2Card(t.id)) <= 0)
  const displayed  = showAll ? sorted : sorted.filter((t) => daysUntilDue(getSm2Card(t.id)) <= 0)

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = displayed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleRate(id, quality) {
    rateCard(id, quality)
    setRatedIds((p) => ({ ...p, [id]: quality }))
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
          <button
            className={`btn btn-secondary btn-sm ${showAll ? 'btn-active' : ''}`}
            onClick={() => { setShowAll((v) => !v); setPage(1) }}
          >
            {showAll ? 'Show due only' : `Show all (${sorted.length})`}
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">🎉</p>
          <h2>All caught up!</h2>
          <p>No topics are due for review right now.</p>
          <button className="btn btn-secondary" onClick={() => setShowAll(true)}>Show all topics</button>
        </div>
      ) : (
        <>
          <div className="study-table-wrapper">
            <table className="study-table">
              <thead>
                <tr>
                  <th className="study-cell--course">Course</th>
                  <th className="study-cell--topic">Topic</th>
                  <th style={{ width: 110 }}>Due</th>
                  <th style={{ width: 260 }}>Rate</th>
                  <th className="study-cell--resources">Resources</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((topic) => {
                  const card   = getSm2Card(topic.id)
                  const rated  = ratedIds[topic.id] !== undefined
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
                        <RateButtons onRate={(q) => handleRate(topic.id, q)} />
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
