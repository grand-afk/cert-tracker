import { useState, useMemo, useEffect } from 'react'
import ResourceTooltip from './ResourceTooltip'
import EditResourceModal from './EditResourceModal'
import AddTopicModal from './AddTopicModal'
import { relativeTime } from '../utils/relativeTime'

const PAGE_SIZE = 15

const STATUS_CONFIG = {
  'not-started': { label: 'Not Started', dot: 'status-dot--not-started' },
  'in-progress':  { label: 'In Progress', dot: 'status-dot--in-progress' },
  'complete':     { label: 'Complete',    dot: 'status-dot--complete' },
}

function TestScoreCell({ id, getTestScore, setTestScore }) {
  const [editing, setEditing] = useState(false)
  const [scoreVal, setScoreVal] = useState('')
  const [dateVal, setDateVal]   = useState('')
  const info = getTestScore(id)

  function openEdit() {
    setScoreVal(info ? String(info.score) : '')
    setDateVal(info?.date ?? new Date().toISOString().split('T')[0])
    setEditing(true)
  }
  function save() {
    const n = Number(scoreVal)
    if (!isNaN(n) && n >= 0 && n <= 100) {
      setTestScore(id, n, dateVal)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="test-score-edit">
        <input className="test-score-input" type="number" min="0" max="100" value={scoreVal}
               onChange={(e) => setScoreVal(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
               autoFocus style={{ width: 54 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>%</span>
        <input className="test-score-input" type="date" value={dateVal}
               onChange={(e) => setDateVal(e.target.value)} style={{ width: 120 }} />
        <button className="icon-btn" onClick={save} title="Save">✓</button>
        <button className="icon-btn" onClick={() => setEditing(false)} title="Cancel">✕</button>
      </div>
    )
  }

  return info ? (
    <button className="test-score-badge" onClick={openEdit} title="Click to edit score">
      <span className="test-score-pct">{info.score}%</span>
      {info.date && <span className="test-score-date">{info.date}</span>}
    </button>
  ) : (
    <button className="test-score-empty" onClick={openEdit} title="Add test score">＋</button>
  )
}

export default function TopicsView({
  topics, courses,
  selectedCourses, getStatus, cycleStatus,
  getLastUpdated, updateTopicResources,
  getTestScore, setTestScore,
  addTopic, deleteTopic,
  clearRating,
}) {
  const [page, setPage]         = useState(1)
  const [sort, setSort]         = useState({ key: null, dir: 'asc' })
  const [editTarget, setEditTarget] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    let result = topics
    if (selectedCourses.length) {
      result = result.filter((t) => selectedCourses.includes(t.courseId))
    }
    if (searchQuery) {
      result = result.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.courseName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return result
  }, [topics, selectedCourses, searchQuery])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    return [...filtered].sort((a, b) => {
      let av = '', bv = ''
      if (sort.key === 'topic')   { av = a.name; bv = b.name }
      if (sort.key === 'course')  { av = a.courseName; bv = b.courseName }
      if (sort.key === 'status')  { av = getStatus(a.id); bv = getStatus(b.id) }
      if (sort.key === 'updated') { av = getLastUpdated(a.id) ?? ''; bv = getLastUpdated(b.id) ?? '' }
      if (sort.key === 'score') {
        const sa = getTestScore(a.id)?.score ?? -1
        const sb = getTestScore(b.id)?.score ?? -1
        return sort.dir === 'asc' ? sa - sb : sb - sa
      }
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, getStatus, getLastUpdated, getTestScore])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key) {
    setPage(1)
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  // N shortcut
  useEffect(() => {
    function onAdd() { setShowAdd(true) }
    window.addEventListener('add-shortcut', onAdd)
    return () => window.removeEventListener('add-shortcut', onAdd)
  }, [])

  // / key → focus search
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('search-input-topics')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function SortTh({ colKey, children, className = '' }) {
    const active = sort.key === colKey
    return (
      <th className={`${className} ${active ? 'sort-active' : ''}`} onClick={() => toggleSort(colKey)} title={`Sort by ${children}`}>
        {children}<span className="sort-arrow">{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </th>
    )
  }

  const completeCount    = filtered.filter((t) => getStatus(t.id) === 'complete').length
  const inProgressCount  = filtered.filter((t) => getStatus(t.id) === 'in-progress').length

  return (
    <div className="study-view">
      <div className="study-header">
        <h2 className="study-title">📋 Topics</h2>
        <div className="study-header-right">
          <span className="study-count">
            {completeCount}/{filtered.length} complete
            {inProgressCount > 0 && ` · ${inProgressCount} in progress`}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>＋ Add Topic</button>
        </div>
      </div>

      <div className="search-bar-wrap">
        <span className="search-bar-icon">🔍</span>
        <input
          id="search-input-topics"
          className="search-bar-input"
          placeholder="Filter... [/]"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); e.target.blur() } }}
        />
        {searchQuery && (
          <button className="search-bar-clear" onClick={() => setSearchQuery('')}>×</button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📋</p>
          <h2>No topics found</h2>
          <p>Select a different course filter, or add a topic with the button above.</p>
        </div>
      ) : (
        <>
          <div className="study-table-wrapper">
            <table className="study-table">
              <thead>
                <tr>
                  <SortTh colKey="course"  className="study-cell--course">Course</SortTh>
                  <SortTh colKey="topic"   className="study-cell--topic">Topic</SortTh>
                  <SortTh colKey="status"  className="study-cell--status">Status</SortTh>
                  <SortTh colKey="score"   style={{ width: 100 }}>Score</SortTh>
                  <th className="study-cell--resources">Resources</th>
                  <SortTh colKey="updated" className="study-cell--updated">Updated</SortTh>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((topic) => {
                  const status  = getStatus(topic.id)
                  const cfg     = STATUS_CONFIG[status]
                  const lastUpd = getLastUpdated(topic.id)
                  return (
                    <tr key={topic.id} className="study-row">
                      <td className="study-cell study-cell--course">
                        <span className="course-badge">
                          <span className="course-badge__dot" style={{ background: topic.courseColor }} />
                          {topic.courseName}
                        </span>
                      </td>
                      <td className="study-cell study-cell--topic">{topic.name}</td>
                      <td className="study-cell study-cell--status">
                        <button className={`status-badge status-badge--${status}`}
                                onClick={() => cycleStatus(topic.id)} title="Click to cycle status">
                          <span className={`status-dot ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      </td>
                      <td className="study-cell" style={{ width: 100 }}>
                        <TestScoreCell id={topic.id} getTestScore={getTestScore} setTestScore={setTestScore} />
                      </td>
                      <td className="study-cell study-cell--resources">
                        <ResourceTooltip resources={topic.resources} topicName={topic.name}
                                         onEdit={() => setEditTarget(topic)} />
                      </td>
                      <td className="study-cell study-cell--updated">
                        {lastUpd ? <span title={new Date(lastUpd).toLocaleString()}>{relativeTime(lastUpd)}</span> : '—'}
                      </td>
                      <td className="study-cell" style={{ textAlign: 'right' }}>
                        <button className="icon-btn icon-btn--danger"
                                title="Delete topic"
                                onClick={() => {
                                  if (window.confirm(`Delete "${topic.name}"?`)) {
                                    deleteTopic(topic.courseId, topic.id)
                                  }
                                }}>
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

      {editTarget && (
        <EditResourceModal title={`${editTarget.courseName} › ${editTarget.name}`}
                           resources={editTarget.resources}
                           onSave={(res) => updateTopicResources(editTarget.id, res)}
                           onClose={() => setEditTarget(null)} />
      )}
      {showAdd && (
        <AddTopicModal courses={courses} onAdd={addTopic} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
