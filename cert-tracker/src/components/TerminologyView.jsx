import { useState, useMemo } from 'react'
import ResourceTooltip from './ResourceTooltip'
import EditResourceModal from './EditResourceModal'
import AddTermModal from './AddTermModal'
import { relativeTime } from '../utils/relativeTime'

const PAGE_SIZE = 15

const STATUS_CONFIG = {
  'not-started': { label: 'Not Started', dot: 'status-dot--not-started' },
  'in-progress': { label: 'In Progress', dot: 'status-dot--in-progress' },
  'complete': { label: 'Complete', dot: 'status-dot--complete' },
}

export default function TerminologyView({
  terminology,
  courses,
  selectedCourses,
  getStatus,
  cycleStatus,
  getLastUpdated,
  updateTermResources,
  addTerm,
  deleteTerm,
}) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'term', dir: 'asc' })
  const [editTarget, setEditTarget] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  // Build a lookup for course colour by id
  const courseMap = useMemo(() => {
    const m = {}
    courses.forEach((c) => { m[c.id] = c })
    return m
  }, [courses])

  // Filter by selected courses
  const filtered = useMemo(() => {
    if (!selectedCourses.length) return terminology
    return terminology.filter((t) =>
      t.courses.some((cid) => selectedCourses.includes(cid))
    )
  }, [terminology, selectedCourses])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = '', bv = ''
      if (sort.key === 'term') { av = a.term; bv = b.term }
      if (sort.key === 'status') { av = getStatus(a.id); bv = getStatus(b.id) }
      if (sort.key === 'updated') { av = getLastUpdated(a.id) ?? ''; bv = getLastUpdated(b.id) ?? '' }
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, getStatus, getLastUpdated])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key) {
    setPage(1)
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  function SortTh({ colKey, children, className = '' }) {
    const active = sort.key === colKey
    return (
      <th
        className={`${className} ${active ? 'sort-active' : ''}`}
        onClick={() => toggleSort(colKey)}
        title={`Sort by ${children}`}
      >
        {children}
        <span className="sort-arrow">{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </th>
    )
  }

  const completeCount = filtered.filter((t) => getStatus(t.id) === 'complete').length

  return (
    <div className="study-view">
      <div className="study-header">
        <h2 className="study-title">📖 Terminology</h2>
        <div className="study-header-right">
          <span className="study-count">{completeCount}/{filtered.length} complete</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>＋ Add Term</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📖</p>
          <h2>No terms found</h2>
          <p>Select a different course filter, or import a cert structure in Settings.</p>
        </div>
      ) : (
        <>
          <div className="study-table-wrapper">
            <table className="study-table">
              <thead>
                <tr>
                  <SortTh colKey="term" className="study-cell--topic">Term</SortTh>
                  <th className="study-cell--definition">Definition</th>
                  <th className="study-cell--course">Courses</th>
                  <SortTh colKey="status" className="study-cell--status">Status</SortTh>
                  <th className="study-cell--resources">Resources</th>
                  <SortTh colKey="updated" className="study-cell--updated">Updated</SortTh>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((term) => {
                  const status = getStatus(term.id)
                  const cfg = STATUS_CONFIG[status]
                  const lastUpdated = getLastUpdated(term.id)
                  return (
                    <tr key={term.id} className="study-row">
                      <td className="study-cell study-cell--topic" style={{ fontWeight: 600 }}>
                        {term.term}
                      </td>
                      <td className="study-cell study-cell--definition">
                        {term.definition}
                      </td>
                      <td className="study-cell study-cell--course">
                        <div className="course-badges">
                          {term.courses.map((cid) => {
                            const c = courseMap[cid]
                            if (!c) return null
                            return (
                              <span key={cid} className="course-badge">
                                <span className="course-badge__dot" style={{ background: c.color }} />
                                {c.name}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="study-cell study-cell--status">
                        <button
                          className={`status-badge status-badge--${status}`}
                          onClick={() => cycleStatus(term.id)}
                          title="Click to cycle status"
                        >
                          <span className={`status-dot ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      </td>
                      <td className="study-cell study-cell--resources">
                        <ResourceTooltip
                          resources={term.resources}
                          topicName={term.term}
                          onEdit={() => setEditTarget(term)}
                        />
                      </td>
                      <td className="study-cell study-cell--updated">
                        {lastUpdated
                          ? <span title={new Date(lastUpdated).toLocaleString()}>{relativeTime(lastUpdated)}</span>
                          : '—'
                        }
                      </td>
                      <td className="study-cell study-cell--actions">
                        <button
                          className="icon-btn icon-btn--danger"
                          onClick={() => { if (window.confirm(`Delete term "${term.term}"?`)) deleteTerm(term.id) }}
                          title="Delete term"
                        >
                          🗑
                        </button>
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

      {showAdd && (
        <AddTermModal courses={courses} onAdd={addTerm} onClose={() => setShowAdd(false)} />
      )}

      {editTarget && (
        <EditResourceModal
          title={editTarget.term}
          resources={editTarget.resources}
          onSave={(res) => updateTermResources(editTarget.id, res)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
