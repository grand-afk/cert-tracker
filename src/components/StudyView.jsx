import { useState, useMemo, useEffect, useRef } from 'react'
import { daysUntilDue, dueLabel, isDue } from '../utils/sm2'
import RateButtons from './RateButtons'
import ResourceTooltip from './ResourceTooltip'
import EditResourceModal from './EditResourceModal'
// SyncBar removed — save/load now lives in TopBar

const PAGE_SIZE = 20

// ── RevisionSelect ────────────────────────────────────────────────────────────
// Uses local optimistic state so the dropdown shows the chosen value instantly,
// without waiting for the full App → useProgress → prop round-trip.
function RevisionSelect({ topicId, field, value, techniques, onSet }) {
  const [local, setLocal] = useState(value ?? '')
  // Sync local state when the persisted value arrives from the parent
  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value
      setLocal(value ?? '')
    }
  }, [value])

  const activeOptions = techniques.filter((t) => t.active)
  // Keep the saved technique visible even if it was later disabled
  const savedTech = local ? techniques.find((t) => t.id === local) : null
  const options = savedTech && !savedTech.active
    ? [savedTech, ...activeOptions]
    : activeOptions

  function handleChange(e) {
    e.stopPropagation()
    const newVal = e.target.value || null
    setLocal(e.target.value)        // immediate visual update
    onSet(topicId, field, newVal)   // persist to progress store
  }

  return (
    <div className="rev-select-wrap">
      <select
        className={`rev-select${local ? ' rev-select--set' : ''}`}
        value={local}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
      >
        <option value="">—</option>
        {options.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      {savedTech && (
        <button
          className="rev-info-btn"
          title={`${savedTech.name}\n\nMethod: ${savedTech.method}\n\nWhy: ${savedTech.rationale}`}
          onClick={(e) => e.stopPropagation()}
        >ℹ</button>
      )}
    </div>
  )
}

function NotesRow({ id, notes, onSave, colSpan }) {
  const [val, setVal] = useState(notes ?? '')
  const dirty = val !== (notes ?? '')
  // Sync if notes prop changes externally (e.g. edit made in CalendarView)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setVal(notes ?? '') }, [notes])
  return (
    <tr className="notes-expand-row">
      <td colSpan={colSpan}>
        <div className="notes-expand-wrap">
          <textarea
            className="notes-textarea"
            placeholder="Add study notes…"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { if (dirty) onSave(val) }}
            rows={3}
          />
          {dirty && (
            <button className="btn btn-primary btn-sm notes-save-btn" onClick={() => onSave(val)}>
              Save
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function StudyView({
  topics,
  selectedCourses,
  getStatus,
  getSm2Card,
  rateCard,
  clearRating,
  getLastUpdated,
  updateTopicResources,
  updateTopicNotes,
  searchQuery,
  revisionTechniques = [],
  getRevisionTechnique,
  setRevisionTechnique,
  syncProps,
  subtopicsEnabled = false,
}) {
  const [ratedIds, setRatedIds]     = useState({})
  const [editTarget, setEditTarget] = useState(null)
  const [page, setPage]             = useState(1)
  const [showDueOnly, setShowDueOnly] = useState(true)
  const [sort, setSort]             = useState({ key: 'due', dir: 'asc' })
  const [expandedId, setExpandedId] = useState(null)

  // Filter by course + global search
  const filtered = useMemo(() => {
    let result = topics
    if (selectedCourses.length) {
      result = result.filter((t) => selectedCourses.includes(t.courseId))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.courseName.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      )
    }
    return result
  }, [topics, selectedCourses, searchQuery])

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
      if (sort.key === 'rate') {
        av = getSm2Card(a.id)?.lastQuality ?? -1
        bv = getSm2Card(b.id)?.lastQuality ?? -1
        return sort.dir === 'asc' ? av - bv : bv - av
      }
      const da = daysUntilDue(getSm2Card(a.id))
      const db = daysUntilDue(getSm2Card(b.id))
      return sort.dir === 'asc' ? da - db : db - da
    })
  }, [filtered, sort, getSm2Card])

  // isDue: includes New (never reviewed), Due Today, and Overdue
  const dueItems  = sorted.filter((t) => isDue(getSm2Card(t.id)))
  const displayed = showDueOnly ? dueItems : sorted

  // Stats for heading: cards rated today, hard (q=3), easy (q=5)
  const today = new Date().toISOString().split('T')[0]
  const ratedToday = sorted.filter((t) => {
    const c = getSm2Card(t.id)
    return c?.lastRated && c.lastRated.startsWith(today)
  })
  const hardToday  = ratedToday.filter((t) => getSm2Card(t.id)?.lastQuality === 3).length
  const easyToday  = ratedToday.filter((t) => getSm2Card(t.id)?.lastQuality === 5).length

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

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'F' || e.key === 'f') {
        e.preventDefault()
        setShowDueOnly((v) => !v)
        setPage(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
          {ratedToday.length > 0 && (
            <span className="study-count">
              {ratedToday.length} studied today
              {hardToday > 0 && ` · ${hardToday} hard`}
              {easyToday > 0 && ` · ${easyToday} easy`}
            </span>
          )}
          <span className="study-count">{dueItems.length} due</span>
          <button
            className={`btn btn-secondary btn-sm ${showDueOnly ? 'btn-active' : ''}`}
            onClick={() => { setShowDueOnly((v) => !v); setPage(1) }}
            title={showDueOnly ? 'Show all  [F]' : 'Show due only  [F]'}
          >
            {showDueOnly ? `Due only` : `Show all (${sorted.length})`}
            <span className="btn-key">[F]</span>
          </button>
        </div>
      </div>

{/* SyncBar removed — save/load in TopBar */}

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
                  {subtopicsEnabled && <SortTh colKey="topicName" style={{ width: 140 }}>Topic</SortTh>}
                  <SortTh colKey="topic">{subtopicsEnabled ? 'Sub-Topic' : 'Topic'}</SortTh>
                  <SortTh colKey="due" style={{ width: 110 }}>Due</SortTh>
                  <SortTh colKey="rate" style={{ width: 260 }}>Rate</SortTh>
                  {revisionTechniques.length > 0 && (
                    <th style={{ width: 120, whiteSpace: 'normal', textAlign: 'center' }} title="Technique used last time">Last<br/>Revision</th>
                  )}
                  {revisionTechniques.length > 0 && (
                    <th style={{ width: 120, whiteSpace: 'normal', textAlign: 'center' }} title="Technique planned for next session">Next<br/>Revision</th>
                  )}
                  <th className="study-cell--resources">Resources</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((topic) => {
                  const card        = getSm2Card(topic.id)
                  const lastQuality = card?.lastQuality ?? null
                  const rated       = ratedIds[topic.id] !== undefined
                  const isExpanded  = expandedId === topic.id
                  return [
                    <tr
                      key={topic.id}
                      className={`study-row study-row--expandable ${rated ? 'study-row--rated' : ''} ${isExpanded ? 'study-row--expanded' : ''}`}
                      onClick={(e) => {
                        if (e.target.closest('button,input,select,a,textarea')) return
                        setExpandedId(isExpanded ? null : topic.id)
                      }}
                    >
                      <td className="study-cell study-cell--course">
                        <span className="course-badge">
                          <span className="course-badge__dot" style={{ background: topic.courseColor }} />
                          {topic.courseName}
                        </span>
                      </td>
                      {subtopicsEnabled && (
                        <td className="study-cell study-cell--topic">
                          {topic.isSub && (
                            <span className="text-muted" style={{ fontSize: 12 }}>{topic.topicName}</span>
                          )}
                        </td>
                      )}
                      <td className="study-cell study-cell--topic">
                        <span className="topic-name-wrap">
                          {topic.name}
                          {topic.notes && <span className="notes-indicator" title="Has notes">📝</span>}
                        </span>
                      </td>
                      <td className="study-cell">
                        <span className={`due-badge ${dueBadgeClass(card)}`}>
                          {dueLabel(card)}
                        </span>
                      </td>
                      <td className="study-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RateButtons
                            onRate={(q) => handleRate(topic.id, q)}
                            card={card}
                            lastQuality={ratedIds[topic.id] !== undefined ? ratedIds[topic.id] : lastQuality}
                          />
                          {card && (
                            <button className="clear-rating-btn" onClick={(e) => { e.stopPropagation(); clearRating(topic.id) }} title="Clear rating">✕ rating</button>
                          )}
                        </div>
                      </td>
                      {revisionTechniques.length > 0 && (
                        <td className="study-cell" style={{ width: 120 }}>
                          <RevisionSelect topicId={topic.id} field="lastRevTechnique"
                            value={getRevisionTechnique?.(topic.id, 'lastRevTechnique')}
                            techniques={revisionTechniques}
                            onSet={setRevisionTechnique ?? (() => {})} />
                        </td>
                      )}
                      {revisionTechniques.length > 0 && (
                        <td className="study-cell" style={{ width: 120 }}>
                          <RevisionSelect topicId={topic.id} field="nextRevTechnique"
                            value={getRevisionTechnique?.(topic.id, 'nextRevTechnique')}
                            techniques={revisionTechniques}
                            onSet={setRevisionTechnique ?? (() => {})} />
                        </td>
                      )}
                      <td className="study-cell study-cell--resources">
                        <ResourceTooltip
                          resources={topic.resources}
                          topicName={topic.name}
                          onEdit={(e) => { e?.stopPropagation?.(); setEditTarget(topic) }}
                        />
                      </td>
                    </tr>,
                    isExpanded && (
                      <NotesRow
                        key={`${topic.id}-notes`}
                        id={topic.id}
                        notes={topic.notes}
                        onSave={(n) => updateTopicNotes(topic.id, n)}
                        colSpan={5 + (subtopicsEnabled ? 1 : 0) + (revisionTechniques.length > 0 ? 2 : 0)}
                      />
                    ),
                  ]
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
