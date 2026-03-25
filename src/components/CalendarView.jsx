import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { useCalendar } from '../hooks/useCalendar'
import { daysUntilDue } from '../utils/sm2'
import RateButtons from './RateButtons'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function minutesToTime(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}` }
function snap15(m) { return Math.round(m / 15) * 15 }

// ─── Edit Slot Modal ──────────────────────────────────────────────────────────
function EditSlotModal({ slot, topic, card, onSave, onRemove, onClose,
                         updateTopicNotes, onRate, onClearRating, onSaveResources }) {
  const [startTime, setStartTime]   = useState(slot.startTime)
  const [duration, setDuration]     = useState(slot.durationMins)
  const [notes, setNotes]           = useState(topic?.notes ?? '')
  const [resources, setResources]   = useState({
    courseContent: topic?.resources?.courseContent ?? '',
    video:         topic?.resources?.video         ?? '',
    anki:          topic?.resources?.anki          ?? '',
    testLink:      topic?.resources?.testLink      ?? '',
  })
  const [localQuality, setLocalQuality] = useState(card?.lastQuality ?? null)

  function save() {
    onSave({ startTime, durationMins: duration })
    if (notes !== (topic?.notes ?? '')) updateTopicNotes?.(topic?.id, notes)
    onSaveResources?.(topic?.id, resources)
    onClose()
  }

  const RESOURCE_FIELDS = [
    ['courseContent', '📚 Course Content URL'],
    ['video',         '🎬 Video URL'],
    ['anki',          '🃏 Anki Deck URL'],
    ['testLink',      '📝 Practice Test URL'],
  ]

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-title">Edit Session</div>
        {topic && (
          <div className="edit-slot-topic">
            <span className="course-badge__dot" style={{ background: topic.courseColor, display: 'inline-block', marginRight: 6 }} />
            <strong>{topic.name}</strong>
            <span className="text-muted" style={{ marginLeft: 8, fontSize: 12 }}>{topic.courseName}</span>
          </div>
        )}

        {/* Time & Duration */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Start Time</label>
            <input type="time" className="form-input" value={startTime} step={900}
                   onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Duration (mins)</label>
            <input type="number" className="form-input" value={duration} min={15} step={15}
                   onChange={(e) => setDuration(Math.max(15, Math.round(Number(e.target.value)/15)*15))} />
          </div>
        </div>

        {/* Rating */}
        <div className="form-group">
          <label className="form-label">Rating</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <RateButtons
              onRate={(q) => { onRate?.(slot.topicId, q); setLocalQuality(q) }}
              card={card}
              lastQuality={localQuality}
            />
            {card && (
              <button className="clear-rating-btn"
                      onClick={() => { onClearRating?.(slot.topicId); setLocalQuality(null) }}>
                ✕ rating
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-input notes-textarea" rows={3} placeholder="Add study notes…"
                    value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Resources */}
        <div className="form-group">
          <label className="form-label">Resources</label>
          {RESOURCE_FIELDS.map(([key, placeholder]) => (
            <input key={key} className="form-input" style={{ marginBottom: 4 }}
                   placeholder={placeholder}
                   value={resources[key]}
                   onChange={(e) => setResources((r) => ({ ...r, [key]: e.target.value }))} />
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => { onRemove(); onClose() }}>Remove</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Slot Modal ───────────────────────────────────────────────────────────
function AddSlotModal({ allTopics, courses, defaultTopicMins, workStart, onAdd, onAddCourse, onAddTopic, onClose }) {
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedTopicId, setSelectedTopicId]   = useState('')
  const [startTime, setStartTime]               = useState(workStart)
  const [duration, setDuration]                 = useState(defaultTopicMins)
  const [otherCourse, setOtherCourse]           = useState('')
  const [otherTopic, setOtherTopic]             = useState('')

  const filteredTopics = (selectedCourseId && selectedCourseId !== '__other__')
    ? allTopics.filter((t) => t.courseId === selectedCourseId)
    : allTopics

  async function handleAdd() {
    let topicId = selectedTopicId
    if (selectedCourseId === '__other__' && otherCourse.trim()) {
      const newCourseId = `course-${Date.now()}`
      await onAddCourse({ id: newCourseId, name: otherCourse.trim() })
      if (selectedTopicId === '__other__' && otherTopic.trim()) {
        const newTopicId = `topic-${Date.now()}`
        await onAddTopic(newCourseId, { id: newTopicId, name: otherTopic.trim() })
        topicId = newTopicId
      }
    } else if (selectedTopicId === '__other__' && otherTopic.trim() && selectedCourseId) {
      const newTopicId = `topic-${Date.now()}`
      await onAddTopic(selectedCourseId, { id: newTopicId, name: otherTopic.trim() })
      topicId = newTopicId
    }
    if (!topicId || topicId === '__other__') return
    onAdd({ topicId, startTime, durationMins: duration })
    onClose()
  }

  const canAdd = selectedTopicId && selectedTopicId !== '__other__'
    ? true
    : selectedTopicId === '__other__' && otherTopic.trim()
      ? true
      : false

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Topic to Schedule</div>
        <div className="form-group">
          <label className="form-label">Course</label>
          <select className="form-input" value={selectedCourseId}
                  onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedTopicId('') }}>
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__other__">+ Other (new course)</option>
          </select>
          {selectedCourseId === '__other__' && (
            <input className="form-input" style={{ marginTop: 6 }} placeholder="New course name"
                   value={otherCourse} onChange={(e) => setOtherCourse(e.target.value)} autoFocus />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Topic</label>
          <select className="form-input" value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}>
            <option value="">Select a topic…</option>
            {filteredTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value="__other__">+ Other (new topic)</option>
          </select>
          {selectedTopicId === '__other__' && (
            <input className="form-input" style={{ marginTop: 6 }} placeholder="New topic name"
                   value={otherTopic} onChange={(e) => setOtherTopic(e.target.value)} />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input type="time" className="form-input" value={startTime} step={900}
                 onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input type="number" className="form-input" value={duration} min={15} step={15}
                 onChange={(e) => setDuration(Math.max(15, Math.round(Number(e.target.value)/15)*15))} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!canAdd}>Add</button>
        </div>
      </div>
    </div>
  )
}

// ─── SlotCard — defined OUTSIDE CalendarView so it has a stable identity ──────
const SlotCard = memo(function SlotCard({
  slot, dk, pxPerMin, minTop,
  allTopics, getSm2Card, rateCard, clearRating, searchQuery,
  focusedSlot, setFocusedSlot,
  selectedSlot, setSelectedSlot,
  setResizing, setTooltip, setEditingSlot, removeSlot, dragRef,
}) {
  const topic = allTopics.find((t) => t.id === slot.topicId)
  if (!topic) return null

  const card         = getSm2Card(slot.topicId)
  const lastQuality  = card?.lastQuality ?? null
  const isFocused    = focusedSlot?.dateKey === dk && focusedSlot?.slotId === slot.id
  const isSelected   = selectedSlot?.dateKey === dk && selectedSlot?.slotId === slot.id
  const startMins    = timeToMinutes(slot.startTime)
  const top          = (startMins - minTop) * pxPerMin
  const height       = Math.max(22, slot.durationMins * pxPerMin)
  const compact      = height < 52
  const matchesSearch = !searchQuery ||
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.courseName.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <div
      className={`cal-slot${isFocused ? ' cal-slot--focused' : ''}${isSelected ? ' cal-slot--selected' : ''}${searchQuery && !matchesSearch ? ' cal-slot--dimmed' : ''}`}
      draggable
      tabIndex={0}
      style={{ top, height, position: 'absolute', left: 2, right: 2, background: topic.courseColor }}
      onFocus={() => setFocusedSlot({ dateKey: dk, slotId: slot.id })}
      onBlur={() => setFocusedSlot(null)}
      onDragStart={(e) => {
        dragRef.current = { id: slot.id, date: dk }
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: slot.id, date: dk }))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={() => { /* dragRef cleared in drop handler */ }}
      onMouseEnter={(e) => setTooltip({ slot, topic, card, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltip(null)}
      onClick={(e) => {
        if (e.target.closest('.cal-slot__resize-top,.cal-slot__resize-bottom,.cal-slot__remove')) return
        // Single click = select/highlight
        setSelectedSlot(isSelected ? null : { dateKey: dk, slotId: slot.id })
        setTooltip(null)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (e.target.closest('.cal-slot__resize-top,.cal-slot__resize-bottom,.cal-slot__remove')) return
        setTooltip(null)
        setEditingSlot({ dateKey: dk, slot })
      }}
    >
      <div className="cal-slot__resize-top"
           onMouseDown={(e) => { e.stopPropagation(); e.preventDefault()
             setResizing({ dateKey: dk, slotId: slot.id, edge: 'top', startY: e.clientY,
               origStart: timeToMinutes(slot.startTime), origDuration: slot.durationMins }) }} />

      {compact ? (
        <div className="cal-slot__compact">
          <span className="cal-slot__time">{slot.startTime}</span>
          <span className="cal-slot__compact-name">{topic.name}</span>
        </div>
      ) : (
        <>
          <div className="cal-slot__header">
            <span className="cal-slot__time">{slot.startTime}</span>
            <button className="cal-slot__remove"
                    onClick={(e) => { e.stopPropagation(); removeSlot(dk, slot.id) }}>×</button>
          </div>
          <div className="cal-slot__topic">{topic.name}</div>
          <div className="cal-slot__course">
            <span className="course-badge__dot" style={{ background: topic.courseColor, filter: 'brightness(0.55)' }} />
            <span className="cal-slot__course-name">{topic.courseName}</span>
          </div>
          {height >= 100 && (
            <div className="cal-slot__actions">
              <RateButtons onRate={(q) => rateCard(slot.topicId, q)} card={card} lastQuality={lastQuality} compact />
              {card && <button className="clear-rating-btn" onClick={(e) => { e.stopPropagation(); clearRating(slot.topicId) }}>✕ rating</button>}
            </div>
          )}
        </>
      )}

      <div className="cal-slot__resize-bottom"
           onMouseDown={(e) => { e.stopPropagation(); e.preventDefault()
             setResizing({ dateKey: dk, slotId: slot.id, edge: 'bottom', startY: e.clientY,
               origStart: timeToMinutes(slot.startTime), origDuration: slot.durationMins }) }} />
    </div>
  )
})

// ─── CalendarView ─────────────────────────────────────────────────────────────
export default function CalendarView({
  allTopics, courses,
  getSm2Card, getStatus, getTopicMins,
  workStart, workEnd, defaultTopicMins, defaultBreakMins,
  rateCard, clearRating,
  maxSessionsPerDay,
  addCourse, addTopic,
  updateTopicNotes, updateTopicResources,
  searchQuery,
  recordAction,
  calendar: calendarProp,
  restoreCalendar,
}) {
  const {
    calendar,
    getDay, setStudyHours, addSlot, removeSlot, moveSlot,
    clearDay, updateSlotTime, updateSlotDuration,
    autoFill, batchSetSlots,
  } = useCalendar()

  const [viewMode, setViewMode]         = useState('week')
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalDate, setAddModalDate] = useState(null)
  const [editingSlot, setEditingSlot]   = useState(null)
  const [focusedSlot, setFocusedSlot]   = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [resizing, setResizing]         = useState(null)
  const [tooltip, setTooltip]           = useState(null)
  const dragRef                         = useRef(null)
  const breakMins                       = defaultBreakMins ?? 0

  // Shared props passed to every SlotCard
  const slotProps = {
    allTopics, getSm2Card, rateCard, clearRating, searchQuery,
    focusedSlot, setFocusedSlot,
    selectedSlot, setSelectedSlot,
    setResizing, setTooltip, setEditingSlot, removeSlot, dragRef,
  }

  // ─── Keyboard events ─────────────────────────────────────────────────────
  useEffect(() => {
    function onCalKey(e) {
      const k = e.detail?.toLowerCase?.()
      if (k === 'd') setViewMode('day')
      else if (k === 'w') setViewMode('week')
      else if (k === 'm') setViewMode('month')
    }
    window.addEventListener('calendar-key', onCalKey)
    return () => window.removeEventListener('calendar-key', onCalKey)
  }, [])

  useEffect(() => {
    function onAdd() {
      setAddModalDate(viewMode === 'day' ? currentDate : (selectedDay || new Date()))
      setShowAddModal(true)
    }
    window.addEventListener('add-shortcut', onAdd)
    return () => window.removeEventListener('add-shortcut', onAdd)
  }, [viewMode, currentDate, selectedDay])

  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // S = schedule current view, X = clear current view
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSchedule(viewMode); return }
      if (e.key === 'x' || e.key === 'X') { e.preventDefault(); handleClear(viewMode); return }
      // Arrow left/right = Prev/Next
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); return }

      // Delete key on selected slot
      if (e.key === 'Delete' && selectedSlot) {
        const before = JSON.parse(JSON.stringify(calendar))
        removeSlot(selectedSlot.dateKey, selectedSlot.slotId)
        const removedSlot = (before[selectedSlot.dateKey]?.slots || []).find((s) => s.id === selectedSlot.slotId)
        if (removedSlot && recordAction) {
          const dk = selectedSlot.dateKey
          recordAction(
            () => addSlot(dk, removedSlot),
            () => removeSlot(dk, removedSlot.id),
            'Delete slot'
          )
        }
        setSelectedSlot(null)
        return
      }

      // Delete or Enter on focused slot (Tab-navigated)
      if (!focusedSlot) return
      if (e.key === 'Delete') {
        const before = JSON.parse(JSON.stringify(calendar))
        removeSlot(focusedSlot.dateKey, focusedSlot.slotId)
        const removedSlot = (before[focusedSlot.dateKey]?.slots || []).find((s) => s.id === focusedSlot.slotId)
        if (removedSlot && recordAction) {
          const dk = focusedSlot.dateKey
          recordAction(
            () => addSlot(dk, removedSlot),
            () => removeSlot(dk, removedSlot.id),
            'Delete slot'
          )
        }
        setFocusedSlot(null)
      } else if (e.key === 'Enter') {
        const day = getDay(focusedSlot.dateKey)
        const slot = (day.slots || []).find((s) => s.id === focusedSlot.slotId)
        if (slot) setEditingSlot({ dateKey: focusedSlot.dateKey, slot })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedSlot, selectedSlot, removeSlot, addSlot, getDay, calendar, recordAction, viewMode])

  // Deselect slot when clicking outside
  useEffect(() => {
    function onMouseDown(e) {
      if (!e.target.closest('.cal-slot')) {
        setSelectedSlot(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ─── Resize via mouse ────────────────────────────────────────────────────
  useEffect(() => {
    if (!resizing) return
    function onMove(e) {
      const dy   = e.clientY - resizing.startY
      const delta = snap15(Math.round(dy))
      if (resizing.edge === 'bottom') {
        updateSlotDuration(resizing.dateKey, resizing.slotId, Math.max(15, resizing.origDuration + delta))
      } else {
        const newStart = snap15(resizing.origStart + delta)
        const newDur   = Math.max(15, resizing.origDuration - (newStart - resizing.origStart))
        updateSlotTime(resizing.dateKey, resizing.slotId, minutesToTime(newStart))
        updateSlotDuration(resizing.dateKey, resizing.slotId, newDur)
      }
    }
    const onUp = () => setResizing(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizing, updateSlotTime, updateSlotDuration])

  // ─── Date helpers ────────────────────────────────────────────────────────
  function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
  function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
  function dk(d) { return d.toISOString().split('T')[0] }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

  function handlePrev() {
    if (viewMode === 'day')   setCurrentDate(addDays(currentDate, -1))
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7))
    else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  function handleNext() {
    if (viewMode === 'day')   setCurrentDate(addDays(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7))
    else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // ─── Clear / Schedule ────────────────────────────────────────────────────
  function getDaysInScope(scope) {
    if (scope === 'day') return [dk(currentDate)]
    if (scope === 'week') {
      const ws = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => dk(addDays(ws, i)))
    }
    const ms = startOfMonth(currentDate), me = endOfMonth(currentDate)
    const days = []; let d = new Date(ms)
    while (d <= me) { days.push(dk(d)); d.setDate(d.getDate() + 1) }
    return days
  }

  function handleClear(scope) {
    const days = getDaysInScope(scope)
    // Capture before state for undo
    const before = JSON.parse(JSON.stringify(calendar))
    days.forEach((d) => clearDay(d))
    if (recordAction) {
      recordAction(
        () => restoreCalendar(before),
        () => days.forEach((d) => clearDay(d)),
        `Clear ${scope}`
      )
    }
  }

  function handleSchedule(scope) {
    const days = getDaysInScope(scope)
    const before = JSON.parse(JSON.stringify(calendar))

    if (scope === 'day') {
      autoFill(days[0], allTopics, defaultTopicMins, getTopicMins, getSm2Card, workStart, workEnd, maxSessionsPerDay, breakMins)
      if (recordAction) {
        recordAction(
          () => restoreCalendar(before),
          () => autoFill(days[0], allTopics, defaultTopicMins, getTopicMins, getSm2Card, workStart, workEnd, maxSessionsPerDay, breakMins),
          `Schedule day`
        )
      }
      return
    }

    // Week / Month: distribute DIFFERENT topics across days, topping up existing slots
    const workStartMins = timeToMinutes(workStart)
    const workEndMins   = timeToMinutes(workEnd)

    const byCourse = {}
    allTopics.forEach((t) => {
      if (!byCourse[t.courseId]) byCourse[t.courseId] = []
      byCourse[t.courseId].push(t)
    })
    const courseIds = Object.keys(byCourse)
    courseIds.forEach((cid) =>
      byCourse[cid].sort((a, b) => daysUntilDue(getSm2Card(a.id)) - daysUntilDue(getSm2Card(b.id)))
    )

    const pointers = {}
    courseIds.forEach((cid) => { pointers[cid] = 0 })

    const updates = {}

    days.forEach((dateKey) => {
      const day          = getDay(dateKey)
      const existingSlots = day.slots || []
      const max          = maxSessionsPerDay ?? 10
      const remaining    = Math.max(0, max - existingSlots.length)

      if (remaining === 0) return

      let currentMins = workStartMins
      if (existingSlots.length > 0) {
        currentMins = existingSlots.reduce((maxEnd, s) => {
          const end = timeToMinutes(s.startTime) + s.durationMins
          return end > maxEnd ? end : maxEnd
        }, workStartMins)
        // Add break after last existing slot
        if (breakMins > 0 && currentMins > workStartMins) currentMins += breakMins
      }

      const newSlots = []
      let didAdd = true

      while (didAdd && newSlots.length < remaining) {
        didAdd = false
        for (const cid of courseIds) {
          if (newSlots.length >= remaining) break
          const group     = byCourse[cid]
          const ptr       = pointers[cid] % group.length
          const topic     = group[ptr]
          const topicMins = getTopicMins(topic.id) ?? defaultTopicMins

          if (currentMins + topicMins <= workEndMins) {
            newSlots.push({
              id: `slot-${Date.now()}-${Math.random()}`,
              topicId:      topic.id,
              startTime:    minutesToTime(currentMins),
              durationMins: topicMins,
            })
            currentMins += topicMins + breakMins
            pointers[cid]++
            didAdd = true
          }
        }
      }

      updates[dateKey] = { studyHours: day.studyHours, slots: [...existingSlots, ...newSlots] }
    })

    batchSetSlots(updates)

    if (recordAction) {
      recordAction(
        () => restoreCalendar(before),
        () => {
          const u2 = {}
          days.forEach((dateKey) => {
            if (updates[dateKey]) u2[dateKey] = updates[dateKey]
          })
          batchSetSlots(u2)
        },
        `Schedule ${scope}`
      )
    }
  }

  // ─── Drop handler factory ────────────────────────────────────────────────
  function makeDropHandler(targetDate, workStartMins, pxPerMin) {
    return (e) => {
      e.preventDefault()
      let info = dragRef.current
      if (!info) {
        try { info = JSON.parse(e.dataTransfer.getData('text/plain')) } catch {}
      }
      if (!info) return
      const rect    = e.currentTarget.getBoundingClientRect()
      const y       = e.clientY - rect.top
      const newMins = snap15(Math.round(workStartMins + y / pxPerMin))
      const before  = JSON.parse(JSON.stringify(calendar))
      const fromDate = info.date
      const fromSlot = (calendar[fromDate]?.slots || []).find((s) => s.id === info.id)
      moveSlot(info.date, info.id, targetDate, minutesToTime(newMins))
      if (recordAction && fromSlot) {
        const tdk = typeof targetDate === 'string' ? targetDate : targetDate.toISOString().split('T')[0]
        recordAction(
          () => restoreCalendar(before),
          () => moveSlot(info.date, info.id, targetDate, minutesToTime(newMins)),
          'Move slot'
        )
      }
      dragRef.current = null
    }
  }

  // ─── DayView — called as a function, NOT a component, to avoid remounts ──
  function DayView() {
    const key            = dk(currentDate)
    const day            = getDay(key)
    const workStartMins  = timeToMinutes(workStart)
    const workEndMins    = timeToMinutes(workEnd)
    const totalMins      = workEndMins - workStartMins
    const PX             = 1.5

    return (
      <div className="cal-day-view">
        <div className="cal-day-header">
          <div className="cal-day-date">{fmtDate(currentDate)}</div>
          <div className="cal-day-controls">
            <input type="number" className="cal-study-hours-input" title="Study hours for this day"
                   value={day.studyHours ?? 2} min={1} max={12}
                   onChange={(e) => setStudyHours(key, parseInt(e.target.value))} />
            <button className="cal-add-day-btn"
                    onClick={() => { setAddModalDate(currentDate); setShowAddModal(true) }}>+ Add Topic</button>
          </div>
        </div>
        <div className="cal-time-grid">
          <div className="cal-time-col">
            {Array.from({ length: Math.ceil(totalMins / 60) }, (_, i) => {
              const m = workStartMins + i * 60
              return <div key={m} className="cal-time-slot" style={{ height: 60 * PX }}>{minutesToTime(m)}</div>
            })}
          </div>
          <div className="cal-slot-area" style={{ position: 'relative', height: totalMins * PX }}
               onDragOver={(e) => e.preventDefault()}
               onDrop={makeDropHandler(currentDate, workStartMins, PX)}>
            {(day.slots || []).map((slot) => (
              <SlotCard key={slot.id} slot={slot} dk={key} pxPerMin={PX} minTop={workStartMins} {...slotProps} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── WeekView — called as a function, NOT a component ────────────────────
  function WeekView() {
    const weekStart     = startOfWeek(currentDate)
    const workStartMins = timeToMinutes(workStart)
    const workEndMins   = timeToMinutes(workEnd)
    const totalMins     = workEndMins - workStartMins
    const PX            = 1.0

    return (
      <div className="cal-week-view">
        <div className="cal-week-grid">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i)
            const key  = dk(date)
            const day  = getDay(key)
            return (
              <div key={key} className="cal-day-col">
                <div className="cal-day-col-header">
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                </div>
                <div className="cal-slot-area" style={{ position: 'relative', height: totalMins * PX }}
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={makeDropHandler(date, workStartMins, PX)}>
                  {(day.slots || []).map((slot) => (
                    <SlotCard key={slot.id} slot={slot} dk={key} pxPerMin={PX} minTop={workStartMins} {...slotProps} />
                  ))}
                </div>
                <button className="cal-add-day-btn"
                        onClick={() => { setAddModalDate(date); setShowAddModal(true) }}>+</button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── MonthView — called as a function, NOT a component ───────────────────
  function MonthView() {
    const monthStart   = startOfMonth(currentDate)
    const monthEnd     = endOfMonth(currentDate)
    const displayStart = startOfWeek(monthStart)
    const days = []; let d = new Date(displayStart)
    while (d <= monthEnd) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }

    return (
      <div className="cal-month-view">
        <div className="cal-month-weekdays">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((n) => (
            <div key={n} className="cal-month-weekday">{n}</div>
          ))}
        </div>
        <div className="cal-month-grid">
          {days.map((date) => {
            const key  = dk(date)
            const day  = getDay(key)
            const isCM = date.getMonth() === currentDate.getMonth()
            return (
              <div key={key} className={`cal-month-day ${!isCM ? 'cal-month-day--other' : ''}`}
                   onClick={() => isCM && setSelectedDay(date)}>
                <div className="cal-month-day-num">{date.getDate()}</div>
                <div className="cal-month-chips">
                  {(day.slots || []).slice(0, 2).map((slot) => {
                    const topic = allTopics.find((t) => t.id === slot.topicId)
                    if (!topic) return null
                    const matches = !searchQuery ||
                      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      topic.courseName.toLowerCase().includes(searchQuery.toLowerCase())
                    return (
                      <div key={slot.id}
                           className={`cal-month-chip${!matches ? ' cal-slot--dimmed' : ''}`}
                           title={topic.name}
                           style={{ borderLeft: `3px solid ${topic.courseColor}`, background: `${topic.courseColor}28` }}
                           onClick={(e) => { e.stopPropagation(); setEditingSlot({ dateKey: key, slot }) }}>
                        {topic.name.substring(0, 14)}
                      </div>
                    )
                  })}
                  {(day.slots || []).length > 2 && (
                    <div className="cal-month-more">+{(day.slots || []).length - 2}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {selectedDay && (() => {
          const key = dk(selectedDay)
          const day = getDay(key)
          return (
            <div className="cal-month-day-detail">
              <div className="cal-month-detail-header">
                {fmtDate(selectedDay)}
                <button className="icon-btn" onClick={() => setSelectedDay(null)}>×</button>
              </div>
              <div className="cal-month-detail-slots">
                {(day.slots || []).map((slot) => {
                  const topic = allTopics.find((t) => t.id === slot.topicId)
                  if (!topic) return null
                  return (
                    <div key={slot.id} className="cal-month-detail-slot"
                         style={{ cursor: 'pointer' }}
                         onClick={() => setEditingSlot({ dateKey: key, slot })}>
                      <span className="course-badge__dot"
                            style={{ background: topic.courseColor, display: 'inline-block', marginRight: 4 }} />
                      <span>{slot.startTime} — {topic.name}</span>
                      <button className="icon-btn"
                              onClick={(e) => { e.stopPropagation(); removeSlot(key, slot.id) }}>✕</button>
                    </div>
                  )
                })}
                <button className="cal-add-detail-btn"
                        onClick={() => { setAddModalDate(selectedDay); setShowAddModal(true) }}>+ Add</button>
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  const scopeLabel = viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month'

  return (
    <div className="calendar-view">

      {/* Hover tooltip */}
      {tooltip && (
        <div className="cal-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div className="cal-tooltip__title">{tooltip.topic.name}</div>
          <div className="cal-tooltip__course">
            <span className="course-badge__dot" style={{ background: tooltip.topic.courseColor }} />
            {tooltip.topic.courseName}
          </div>
          <div className="cal-tooltip__meta">
            {tooltip.slot.startTime} · {tooltip.slot.durationMins} min
            {tooltip.card?.lastQuality != null && ` · Last: ${{ 0:'Again',3:'Hard',4:'Good',5:'Easy' }[tooltip.card.lastQuality]}`}
          </div>
          {tooltip.topic.notes && (
            <div className="cal-tooltip__notes">
              {tooltip.topic.notes.slice(0, 80)}{tooltip.topic.notes.length > 80 ? '…' : ''}
            </div>
          )}
          <div className="cal-tooltip__hint">Click to select · Double-click to edit · Delete to remove</div>
        </div>
      )}

      {/* Header */}
      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={handlePrev} title="Previous  [←]">← Prev</button>
          <button className="cal-nav-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="cal-nav-btn" onClick={handleNext} title="Next  [→]">Next →</button>
        </div>

        <div className="cal-date-label">
          {viewMode === 'day' && fmtDate(currentDate)}
          {viewMode === 'week' && (() => {
            const ws = startOfWeek(currentDate)
            return `${fmtDate(ws)} – ${fmtDate(addDays(ws, 6))}`
          })()}
          {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        <div className="cal-view-buttons">
          {['day','week','month'].map((m) => (
            <button key={m}
                    className={`cal-view-btn${viewMode === m ? ' cal-view-btn--active' : ''}`}
                    onClick={() => setViewMode(m)}
                    title={`${m[0].toUpperCase() + m.slice(1)} view  [${m[0].toUpperCase()}]`}>
              {m[0].toUpperCase()}
            </button>
          ))}
        </div>

        <div className="cal-actions">
          <button className="cal-action-btn cal-action-btn--schedule"
                  onClick={() => handleSchedule(viewMode)}
                  title="Schedule current view  [S]">▶ Schedule {scopeLabel}</button>
          <button className="cal-action-btn cal-action-btn--clear"
                  onClick={() => handleClear(viewMode)}
                  title="Clear current view  [X]">✕ Clear {scopeLabel}</button>
        </div>
      </div>

      {/* Views — called as plain functions, NOT JSX components, so no remounting */}
      {viewMode === 'day'   && DayView()}
      {viewMode === 'week'  && WeekView()}
      {viewMode === 'month' && MonthView()}

      {/* Add modal */}
      {showAddModal && (
        <AddSlotModal
          allTopics={allTopics}
          courses={courses}
          defaultTopicMins={defaultTopicMins}
          workStart={workStart}
          onAdd={(slotData) => {
            const before = JSON.parse(JSON.stringify(calendar))
            addSlot(addModalDate, slotData)
            if (recordAction) {
              // We don't know the generated id yet; use restoreCalendar for undo
              setTimeout(() => {
                recordAction(
                  () => restoreCalendar(before),
                  () => addSlot(addModalDate, slotData),
                  'Add slot'
                )
              }, 0)
            }
          }}
          onAddCourse={addCourse}
          onAddTopic={addTopic}
          onClose={() => { setShowAddModal(false); setAddModalDate(null) }}
        />
      )}

      {/* Edit modal */}
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot.slot}
          topic={allTopics.find((t) => t.id === editingSlot.slot.topicId)}
          card={getSm2Card(editingSlot.slot.topicId)}
          onSave={({ startTime, durationMins }) => {
            const before = JSON.parse(JSON.stringify(calendar))
            updateSlotTime(editingSlot.dateKey, editingSlot.slot.id, startTime)
            updateSlotDuration(editingSlot.dateKey, editingSlot.slot.id, durationMins)
            if (recordAction) {
              const origTime = editingSlot.slot.startTime
              const origDur  = editingSlot.slot.durationMins
              const dk2      = editingSlot.dateKey
              const sid      = editingSlot.slot.id
              recordAction(
                () => { updateSlotTime(dk2, sid, origTime); updateSlotDuration(dk2, sid, origDur) },
                () => { updateSlotTime(dk2, sid, startTime); updateSlotDuration(dk2, sid, durationMins) },
                'Edit slot time'
              )
            }
          }}
          onRemove={() => {
            const before = JSON.parse(JSON.stringify(calendar))
            const removedSlot = editingSlot.slot
            const dk2 = editingSlot.dateKey
            removeSlot(dk2, removedSlot.id)
            if (recordAction) {
              recordAction(
                () => addSlot(dk2, removedSlot),
                () => removeSlot(dk2, removedSlot.id),
                'Remove slot'
              )
            }
          }}
          onClose={() => setEditingSlot(null)}
          updateTopicNotes={updateTopicNotes}
          onRate={rateCard}
          onClearRating={clearRating}
          onSaveResources={updateTopicResources}
        />
      )}
    </div>
  )
}
