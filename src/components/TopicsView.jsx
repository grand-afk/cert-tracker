import { useState, useMemo, useEffect, useRef } from 'react'
import ResourceTooltip from './ResourceTooltip'
import EditResourceModal from './EditResourceModal'
import AddTopicModal from './AddTopicModal'
// SyncBar removed — save/load now lives in TopBar
import { relativeTime, fmtDisplayDate } from '../utils/relativeTime'

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
        {/* type="text" removes browser spinner arrows; save() validates numerically */}
        <input className="test-score-input" type="text" inputMode="numeric" placeholder="0–100"
               value={scoreVal}
               onChange={(e) => setScoreVal(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
               autoFocus style={{ width: 60 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>%</span>
        <input className="test-score-input" type="date" value={dateVal}
               onChange={(e) => setDateVal(e.target.value)} style={{ width: 120 }} />
        <button className="icon-btn" onClick={save} title="Save">✓</button>
        <button className="icon-btn" onClick={() => setEditing(false)} title="Cancel">✕</button>
      </div>
    )
  }

  return info ? (
    // Score and date shown inline side-by-side
    <button className="test-score-badge" onClick={openEdit} title="Click to edit score"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="test-score-pct">{info.score}%</span>
      {info.date && <span className="test-score-date" style={{ whiteSpace: 'nowrap' }}>{fmtDisplayDate(info.date)}</span>}
    </button>
  ) : (
    <button className="test-score-empty" onClick={openEdit} title="Add test score">＋</button>
  )
}

// ── TimeStepInput — step time by 15-min increments ────────────────────────────
function TimeStepInput({ value, onChange }) {
  function toMins(hhmm) {
    if (!hhmm) return 0
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  function fromMins(mins) {
    const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
    const m = ((mins % 1440) + 1440) % 1440 % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const mins = toMins(value)
  return (
    <div className="step-input" style={{ height: 30 }}>
      <button type="button" className="step-input__btn" style={{ width: 28, height: 30 }}
              onClick={() => onChange(fromMins(mins - 15))}>−</button>
      <span className="step-input__val" style={{ minWidth: 44, fontSize: 12 }}>{value || '—'}</span>
      <button type="button" className="step-input__btn" style={{ width: 28, height: 30 }}
              onClick={() => onChange(fromMins(mins + 15))}>+</button>
    </div>
  )
}

function DueDateCell({ topic, setTopicDueDate, onDueDateChange }) {
  const [editing, setEditing] = useState(false)
  const [dateVal, setDateVal] = useState('')
  const [timeVal, setTimeVal] = useState('')
  const { dueDate, dueTime } = topic
  const editRef  = useRef(null)
  const saveFnRef = useRef(null)

  function openEdit() {
    setDateVal(dueDate ?? '')
    setTimeVal(dueTime ?? '')
    setEditing(true)
  }
  function save() {
    const newDate = dateVal || null
    const newTime = timeVal || null
    setTopicDueDate(topic.id, newDate, newTime)
    onDueDateChange?.(topic.id, newDate, newTime, dueDate ?? null, dueTime ?? null)
    setEditing(false)
  }
  function clear() {
    setTopicDueDate(topic.id, null, null)
    onDueDateChange?.(topic.id, null, null, dueDate ?? null, dueTime ?? null)
    setEditing(false)
  }

  // Keep saveFnRef current so the pointerdown listener always calls the latest save
  saveFnRef.current = save

  // Commit on tap/click outside the editing widget
  useEffect(() => {
    if (!editing) return
    function onPointerDown(e) {
      if (editRef.current && !editRef.current.contains(e.target)) {
        saveFnRef.current()
      }
    }
    // Use capture so we catch taps on other rows before they bubble
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [editing])

  if (editing) {
    return (
      <div className="due-date-edit" ref={editRef}>
        <input type="date" className="test-score-input" value={dateVal}
               onChange={(e) => setDateVal(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
               autoFocus />
        <TimeStepInput value={timeVal} onChange={setTimeVal} />
        <button className="icon-btn" onClick={save} title="Save">✓</button>
        {dueDate && <button className="icon-btn" onClick={clear} title="Clear due date">✕</button>}
        {!dueDate && <button className="icon-btn" onClick={() => setEditing(false)} title="Cancel">✕</button>}
      </div>
    )
  }

  if (!dueDate) {
    return <button className="test-score-empty" onClick={openEdit} title="Set due date">＋</button>
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const diff  = Math.ceil((due - today) / 86400000)
  const overdue = diff < 0
  const label = overdue
    ? `${Math.abs(diff)}d overdue`
    : diff === 0 ? 'Today'
    : `in ${diff}d`

  return (
    <button className={`due-date-badge ${overdue ? 'due-date-badge--overdue' : ''}`}
            onClick={openEdit}
            title={`Due: ${fmtDisplayDate(dueDate)}${dueTime ? ' ' + dueTime : ''} — click to edit`}>
      <span className="due-date-abs">{fmtDisplayDate(dueDate)}{dueTime && <span className="due-date-time"> {dueTime}</span>}</span>
      <span className="due-date-rel">{label}</span>
    </button>
  )
}

function NotesRow({ id, notes, onSave, colSpan, onClose, autoFocusTextarea = true }) {
  const [val, setVal] = useState(notes ?? '')
  const dirty = val !== (notes ?? '')
  const wrapRef = useRef(null)

  // Sync if notes prop changes externally (e.g. edit made in CalendarView)
  useEffect(() => { setVal(notes ?? '') }, [notes])

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <tr className="notes-expand-row">
      <td colSpan={colSpan}>
        <div className="notes-expand-wrap" ref={wrapRef}>
          <textarea
            className="notes-textarea"
            placeholder="Add study notes…"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { if (dirty) onSave(val) }}
            rows={3}
            autoFocus={autoFocusTextarea}
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

export default function TopicsView({
  topics, courses,
  selectedCourses, getStatus, cycleStatus,
  getLastUpdated, updateTopicResources,
  updateTopicNotes,
  getTestScore, setTestScore,
  setTopicDueDate,
  onDueDateChange,
  addTopic, renameTopic, renameSubtopic, deleteTopic,
  subtopicsEnabled, addSubtopic,
  clearRating,
  searchQuery,
  syncProps,
}) {
  const [page, setPage]         = useState(1)
  const [sort, setSort]         = useState({ key: null, dir: 'asc' })
  const [editTarget, setEditTarget] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [expandedId, setExpandedId] = useState(null)   // double-click expands notes
  const [selectedId, setSelectedId] = useState(null)   // single-click selects row
  // Subtopic add inline form
  const [addingSubForTopicId, setAddingSubForTopicId] = useState(null)
  const [newSubName, setNewSubName] = useState('')
  // Inline rename state: { id, courseId, topicId (for subs), isSub, value }
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal]   = useState('')

  function startRename(topic) {
    setRenamingId(topic.id)
    setRenameVal(topic.name)
  }
  function commitRename(topic) {
    const name = renameVal.trim()
    if (name && name !== topic.name) {
      if (topic.isSub) renameSubtopic(topic.courseId, topic.topicId, topic.id, name)
      else             renameTopic(topic.courseId, topic.id, name)
    }
    setRenamingId(null)
  }
  const tableRef = useRef(null)

  // ── Column visibility ──────────────────────────────────────────────────────
  const [hiddenCols, setHiddenCols] = useState(() => {
    try { return JSON.parse(localStorage.getItem('topics_hidden_cols') || '[]') } catch { return [] }
  })
  function toggleCol(key) {
    const next = hiddenCols.includes(key) ? hiddenCols.filter((k) => k !== key) : [...hiddenCols, key]
    setHiddenCols(next)
    try { localStorage.setItem('topics_hidden_cols', JSON.stringify(next)) } catch {}
  }
  const cv = (key) => !hiddenCols.includes(key)  // isVisible(key)

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

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    return [...filtered].sort((a, b) => {
      let av = '', bv = ''
      if (sort.key === 'topic')   { av = a.name; bv = b.name }
      if (sort.key === 'course')  { av = a.courseName; bv = b.courseName }
      if (sort.key === 'status')  { av = getStatus(a.id); bv = getStatus(b.id) }
      if (sort.key === 'updated') { av = getLastUpdated(a.id) ?? ''; bv = getLastUpdated(b.id) ?? '' }
      if (sort.key === 'due') { av = a.dueDate ?? '9999'; bv = b.dueDate ?? '9999' }
      if (sort.key === 'score') {
        const sa = getTestScore(a.id)?.score ?? -1
        const sb = getTestScore(b.id)?.score ?? -1
        return sort.dir === 'asc' ? sa - sb : sb - sa
      }
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, getStatus, getLastUpdated, getTestScore])

  // When subtopicsEnabled, all parent topics show as group header rows.
  // Subtopics appear as data rows beneath their parent's header.
  // Topics with no subtopics show only a group header (+ Sub button to add one).
  const displayList = useMemo(() => {
    if (!subtopicsEnabled) return sorted
    const result = []
    const seenGroupId = new Set()
    for (const item of sorted) {
      if (item.isSub) {
        // Emit the parent group header the first time we see this topicId
        if (!seenGroupId.has(item.topicId)) {
          seenGroupId.add(item.topicId)
          // Use topicDueDate/topicDueTime carried from the parent by getAllItems —
          // parent topics are not in sorted when subtopicsEnabled so a sorted.find() would return undefined
          result.push({
            __isGroupHeader: true,
            id: `__group-${item.topicId}`,
            topicId: item.topicId,
            topicName: item.topicName,
            courseId: item.courseId,
            courseName: item.courseName,
            courseColor: item.courseColor,
            dueDate: item.topicDueDate ?? null,
            dueTime: item.topicDueTime ?? null,
          })
        }
        result.push(item)
      } else {
        // Parent topic with no subtopics yet — show only as a group header
        if (!seenGroupId.has(item.id)) {
          seenGroupId.add(item.id)
          result.push({
            __isGroupHeader: true,
            id: `__group-${item.id}`,
            topicId: item.id,
            topicName: item.name,
            courseId: item.courseId,
            courseName: item.courseName,
            courseColor: item.courseColor,
            dueDate: item.dueDate ?? null,
            dueTime: item.dueTime ?? null,
          })
        }
      }
    }
    return result
  }, [sorted, subtopicsEnabled])

  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = displayList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleAddSub(topicId, courseId) {
    if (!newSubName.trim() || !addSubtopic) return
    const id = `sub-${topicId}-${Date.now()}`
    addSubtopic(courseId, topicId, { id, name: newSubName.trim() })
    setNewSubName('')
    setAddingSubForTopicId(null)
  }

  function toggleSort(key) {
    setPage(1)
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  // Close notes when clicking outside table
  useEffect(() => {
    function onMouseDown(e) {
      if (expandedId && tableRef.current && !tableRef.current.contains(e.target)) {
        setExpandedId(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [expandedId])

  // N shortcut
  useEffect(() => {
    function onAdd() { setShowAdd(true) }
    window.addEventListener('add-shortcut', onAdd)
    return () => window.removeEventListener('add-shortcut', onAdd)
  }, [])

  function SortTh({ colKey, children, className = '', style }) {
    const active = sort.key === colKey
    return (
      <th className={`${className} ${active ? 'sort-active' : ''}`} style={style}
          onClick={() => toggleSort(colKey)} title={`Sort by ${children}`}>
        {children}<span className="sort-arrow">{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </th>
    )
  }

  // Parent topics (for subtopic modal's parent selector)
  const parentTopics = useMemo(() => topics.filter((t) => !t.isSub), [topics])

  const completeCount    = filtered.filter((t) => !t.__isGroupHeader && getStatus(t.id) === 'complete').length
  const inProgressCount  = filtered.filter((t) => !t.__isGroupHeader && getStatus(t.id) === 'in-progress').length
  // colCount for colspan on group headers / notes rows
  // When subtopicsEnabled an extra TOPIC column is inserted between COURSE and SUB-TOPIC
  const colCount = 3 + (subtopicsEnabled ? 1 : 0) + (cv('score') ? 1 : 0) + (cv('due') ? 1 : 0) + (cv('updated') ? 1 : 0) + 2

  return (
    <div className="study-view">
      <div className="study-header">
        <h2 className="study-title">📚 Topics</h2>
        <div className="study-header-right">
          <span className="study-count">
            {completeCount}/{filtered.length} complete
            {inProgressCount > 0 && ` · ${inProgressCount} in progress`}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(true)}>＋ Add Topic</button>
        </div>
      </div>

{/* SyncBar removed — save/load in TopBar */}

      {/* Column visibility toggles */}
      <div className="col-vis-bar">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Columns:</span>
        {[
          { key: 'score',   label: 'Score' },
          { key: 'due',     label: 'Due' },
          { key: 'updated', label: 'Updated' },
        ].map(({ key, label }) => (
          <button key={key} className={`col-vis-btn ${cv(key) ? 'col-vis-btn--visible' : ''}`}
                  onClick={() => toggleCol(key)} title={`${cv(key) ? 'Hide' : 'Show'} ${label}`}>
            {cv(key) ? '●' : '○'} {label}
          </button>
        ))}
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
            <table className="study-table" ref={tableRef}>
              <thead>
                <tr>
                  <SortTh colKey="course"  className="study-cell--course">Course</SortTh>
                  {subtopicsEnabled && <SortTh colKey="topicName" className="study-cell--topic">Topic</SortTh>}
                  <SortTh colKey="topic"   className="study-cell--topic">{subtopicsEnabled ? 'Sub-Topic' : 'Topic'}</SortTh>
                  <SortTh colKey="status"  className="study-cell--status">Status</SortTh>
                  {cv('score')        && <SortTh colKey="score"   style={{ width: 160 }}>Score</SortTh>}
                  {cv('due')          && <SortTh colKey="due"     style={{ width: 170 }}>Due</SortTh>}
                  <th className="study-cell--resources">Resources</th>
                  {cv('updated')      && <SortTh colKey="updated" className="study-cell--updated">Updated</SortTh>}
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((topic) => {
                  // ── Group header row (subtopics mode) ──────────────────────
                  if (topic.__isGroupHeader) {
                    const headerObj = { id: topic.topicId, courseId: topic.courseId, name: topic.topicName, isSub: false }
                    return [
                      <tr key={topic.id} className="topic-group-header-row">
                        <td colSpan={colCount}>
                          <div className="topic-group-header-content">
                            <span className="course-badge">
                              <span className="course-badge__dot" style={{ background: topic.courseColor }} />
                              {topic.courseName}
                            </span>
                            {renamingId === topic.topicId ? (
                              <input
                                className="form-input"
                                style={{ fontSize: 13, padding: '2px 6px', height: 28, flex: 1, maxWidth: 260 }}
                                value={renameVal}
                                autoFocus
                                onChange={(e) => setRenameVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')  { e.stopPropagation(); commitRename(headerObj) }
                                  if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null) }
                                }}
                                onBlur={() => commitRename(headerObj)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="topic-group-name">{topic.topicName}</span>
                            )}
                            {setTopicDueDate && cv('due') && (
                              <DueDateCell
                                topic={{ id: topic.topicId, dueDate: topic.dueDate ?? null, dueTime: topic.dueTime ?? null }}
                                setTopicDueDate={setTopicDueDate}
                                onDueDateChange={onDueDateChange}
                              />
                            )}
                            <div className="topic-group-actions">
                              {addSubtopic && (
                                <button
                                  className="btn btn-secondary btn-sm topic-group-add-btn"
                                  onClick={() => { setAddingSubForTopicId(topic.topicId); setNewSubName('') }}
                                  title="Add subtopic"
                                >
                                  ＋ Sub
                                </button>
                              )}
                              <button className="icon-btn" title="Rename topic"
                                onClick={(e) => { e.stopPropagation(); startRename(headerObj) }}>✏️</button>
                              <button className="icon-btn icon-btn--danger" title="Delete topic"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm(`Delete "${topic.topicName}"?`)) deleteTopic(topic.courseId, topic.topicId)
                                }}>🗑</button>
                            </div>
                          </div>
                        </td>
                      </tr>,
                      addingSubForTopicId === topic.topicId && (
                        <tr key={`${topic.id}-add`} className="add-subtopic-row">
                          <td colSpan={colCount}>
                            <div className="add-subtopic-form">
                              <input
                                className="form-input"
                                placeholder="Subtopic name…"
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSub(topic.topicId, topic.courseId)
                                  if (e.key === 'Escape') setAddingSubForTopicId(null)
                                }}
                                autoFocus
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => handleAddSub(topic.topicId, topic.courseId)} disabled={!newSubName.trim()}>Add</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setAddingSubForTopicId(null)}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ),
                    ]
                  }

                  // ── Regular topic / subtopic row ────────────────────────────
                  const status  = getStatus(topic.id)
                  const cfg     = STATUS_CONFIG[status]
                  const lastUpd = getLastUpdated(topic.id)
                  const isExpanded = expandedId === topic.id
                  const isSelected = selectedId === topic.id
                  return [
                    <tr
                      key={topic.id}
                      className={`study-row study-row--expandable${topic.isSub ? ' subtopic-row' : ''}${isExpanded ? ' study-row--expanded' : ''}${isSelected ? ' study-row--selected' : ''}`}
                      onClick={(e) => {
                        if (e.target.closest('button,input,select,a,textarea')) return
                        setExpandedId(isExpanded ? null : topic.id)
                        setSelectedId(topic.id)
                      }}
                    >
                      <td className="study-cell study-cell--course">
                        {topic.isSub ? (
                          // Just the colour dot — topic name is in the Topic column
                          <span className="course-badge__dot" style={{ background: topic.courseColor, display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginLeft: 4 }} />
                        ) : (
                          <span className="course-badge">
                            <span className="course-badge__dot" style={{ background: topic.courseColor }} />
                            {topic.courseName}
                          </span>
                        )}
                      </td>
                      {subtopicsEnabled && (
                        // TOPIC column:
                        //  • subtopic row  → shows parent topic name (muted)
                        //  • parent row    → shows topic name (bold); rename input goes here
                        <td className="study-cell study-cell--topic">
                          {topic.isSub ? (
                            <span className="text-muted" style={{ fontSize: 12 }}>{topic.topicName}</span>
                          ) : renamingId === topic.id ? (
                            <input
                              className="form-input"
                              style={{ fontSize: 13, padding: '2px 6px', height: 28 }}
                              value={renameVal}
                              autoFocus
                              onChange={(e) => setRenameVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')  { e.stopPropagation(); commitRename(topic) }
                                if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null) }
                              }}
                              onBlur={() => commitRename(topic)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="topic-name-wrap">
                              {topic.name}
                              {topic.notes && <span className="notes-indicator" title="Has notes">📝</span>}
                            </span>
                          )}
                        </td>
                      )}
                      {/* SUB-TOPIC column (or Topic column when subtopicsEnabled=false):
                          • subtopic row  → shows subtopic name; rename input goes here
                          • parent row    → empty when subtopicsEnabled */}
                      <td className="study-cell study-cell--topic">
                        {topic.isSub ? (
                          renamingId === topic.id ? (
                            <input
                              className="form-input"
                              style={{ fontSize: 13, padding: '2px 6px', height: 28 }}
                              value={renameVal}
                              autoFocus
                              onChange={(e) => setRenameVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')  { e.stopPropagation(); commitRename(topic) }
                                if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null) }
                              }}
                              onBlur={() => commitRename(topic)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="topic-name-wrap">
                              {topic.name}
                              {topic.notes && <span className="notes-indicator" title="Has notes">📝</span>}
                            </span>
                          )
                        ) : subtopicsEnabled ? null : (
                          // subtopicsEnabled=false: single-column mode — name goes here
                          renamingId === topic.id ? (
                            <input
                              className="form-input"
                              style={{ fontSize: 13, padding: '2px 6px', height: 28 }}
                              value={renameVal}
                              autoFocus
                              onChange={(e) => setRenameVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')  { e.stopPropagation(); commitRename(topic) }
                                if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null) }
                              }}
                              onBlur={() => commitRename(topic)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="topic-name-wrap">
                              {topic.name}
                              {topic.notes && <span className="notes-indicator" title="Has notes">📝</span>}
                            </span>
                          )
                        )}
                      </td>
                      <td className="study-cell study-cell--status">
                        <button className={`status-badge status-badge--${status}`}
                                onClick={(e) => { e.stopPropagation(); cycleStatus(topic.id) }} title="Click to cycle status">
                          <span className={`status-dot ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      </td>
                      {cv('score') && (
                        <td className="study-cell" style={{ width: 160 }}>
                          <TestScoreCell id={topic.id} getTestScore={getTestScore} setTestScore={setTestScore} />
                        </td>
                      )}
                      {cv('due') && (
                        <td className="study-cell" style={{ width: 170 }}>
                          {setTopicDueDate && (
                            <DueDateCell
                              topic={
                                // Subtopic with no individual due date: fall back to parent's due date.
                                // Use topicId so edits save to the parent topic, same as the group header.
                                topic.isSub && !topic.dueDate
                                  ? { ...topic, id: topic.topicId, dueDate: topic.topicDueDate ?? null, dueTime: topic.topicDueTime ?? null }
                                  : topic
                              }
                              setTopicDueDate={setTopicDueDate}
                              onDueDateChange={onDueDateChange}
                            />
                          )}
                        </td>
                      )}
                      <td className="study-cell study-cell--resources">
                        <ResourceTooltip resources={topic.resources} topicName={topic.name}
                                         onEdit={(e) => { e?.stopPropagation?.(); setEditTarget(topic) }} />
                      </td>
                      {cv('updated') && (
                        <td className="study-cell study-cell--updated">
                          {lastUpd ? <span title={new Date(lastUpd).toLocaleString()}>{relativeTime(lastUpd)}</span> : '—'}
                        </td>
                      )}
                      <td className="study-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="icon-btn"
                                title={topic.isSub ? 'Rename subtopic & edit notes' : 'Rename topic & edit notes'}
                                onClick={(e) => { e.stopPropagation(); startRename(topic); setExpandedId(topic.id) }}>
                          ✏️
                        </button>
                        <button className="icon-btn icon-btn--danger"
                                title={topic.isSub ? 'Delete subtopic' : 'Delete topic'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm(`Delete "${topic.name}"?`)) {
                                    deleteTopic(topic.courseId, topic.id)
                                  }
                                }}>
                          🗑
                        </button>
                      </td>
                    </tr>,
                    isExpanded && (
                      <NotesRow
                        key={`${topic.id}-notes`}
                        id={topic.id}
                        notes={topic.notes}
                        onSave={(n) => updateTopicNotes(topic.id, n)}
                        colSpan={colCount}
                        onClose={() => setExpandedId(null)}
                        autoFocusTextarea={renamingId !== topic.id}
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
        <EditResourceModal title={`${editTarget.courseName} › ${editTarget.name}`}
                           resources={editTarget.resources}
                           onSave={(res) => updateTopicResources(editTarget.id, res)}
                           onClose={() => setEditTarget(null)} />
      )}
      {showAdd && (
        <AddTopicModal
          courses={courses}
          onAdd={addTopic}
          onClose={() => setShowAdd(false)}
          topics={parentTopics}
          onAddSub={addSubtopic}
          subtopicsEnabled={subtopicsEnabled}
        />
      )}
    </div>
  )
}
