import { useState, useEffect, useRef, useCallback } from 'react'
import { useCalendar } from '../hooks/useCalendar'
import RateButtons from './RateButtons'

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function snap15(mins) {
  return Math.round(mins / 15) * 15
}

// ─── Edit Slot Modal ─────────────────────────────────────────────────────────
function EditSlotModal({ slot, topic, onSave, onRemove, onClose, updateTopicNotes }) {
  const [startTime, setStartTime] = useState(slot.startTime)
  const [durationMins, setDuration] = useState(slot.durationMins)
  const [notes, setNotes] = useState(topic?.notes ?? '')

  function save() {
    onSave({ startTime, durationMins })
    if (notes !== (topic?.notes ?? '')) updateTopicNotes?.(topic?.id, notes)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Edit Session</div>
        {topic && (
          <div className="edit-slot-topic">
            <span className="course-badge__dot" style={{ background: topic.courseColor, display: 'inline-block', marginRight: 6 }} />
            <strong>{topic.name}</strong>
            <span className="text-muted" style={{ marginLeft: 8, fontSize: 12 }}>{topic.courseName}</span>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input
            type="time"
            className="form-input"
            value={startTime}
            step={900}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input
            type="number"
            className="form-input"
            value={durationMins}
            min={15}
            step={15}
            onChange={(e) => setDuration(Math.max(15, Math.round(Number(e.target.value) / 15) * 15))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-input notes-textarea"
            rows={3}
            placeholder="Add study notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
  const [durationMins, setDuration]             = useState(defaultTopicMins)
  const [otherCourse, setOtherCourse]           = useState('')
  const [otherTopic, setOtherTopic]             = useState('')
  const [saving, setSaving]                     = useState(false)

  const filteredTopics = selectedCourseId && selectedCourseId !== '__other__'
    ? allTopics.filter((t) => t.courseId === selectedCourseId)
    : allTopics

  async function handleAdd() {
    setSaving(true)
    let topicId = selectedTopicId
    let finalDuration = durationMins

    // Handle "Other" Course → create it then create topic under it
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

    if (!topicId || topicId === '__other__') { setSaving(false); return }

    onAdd({ topicId, startTime, durationMins: finalDuration })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Topic to Schedule</div>

        <div className="form-group">
          <label className="form-label">Course</label>
          <select
            className="form-input"
            value={selectedCourseId}
            onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedTopicId('') }}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="__other__">+ Other (new course)</option>
          </select>
          {selectedCourseId === '__other__' && (
            <input
              className="form-input"
              style={{ marginTop: 6 }}
              placeholder="New course name"
              value={otherCourse}
              onChange={(e) => setOtherCourse(e.target.value)}
              autoFocus
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Topic</label>
          <select
            className="form-input"
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
          >
            <option value="">Select a topic…</option>
            {filteredTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            <option value="__other__">+ Other (new topic)</option>
          </select>
          {selectedTopicId === '__other__' && (
            <input
              className="form-input"
              style={{ marginTop: 6 }}
              placeholder="New topic name"
              value={otherTopic}
              onChange={(e) => setOtherTopic(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input type="time" className="form-input" value={startTime} step={900}
                 onChange={(e) => setStartTime(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input type="number" className="form-input" value={durationMins} min={15} step={15}
                 onChange={(e) => setDuration(Math.max(15, Math.round(Number(e.target.value) / 15) * 15))} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={saving || (!selectedTopicId || (selectedTopicId === '__other__' && !otherTopic.trim()))}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main CalendarView ────────────────────────────────────────────────────────
export default function CalendarView({
  allTopics,
  courses,
  getSm2Card,
  getStatus,
  getTopicMins,
  workStart,
  workEnd,
  defaultTopicMins,
  rateCard,
  clearRating,
  maxSessionsPerDay,
  addCourse,
  addTopic,
  updateTopicNotes,
  searchQuery,
}) {
  const {
    getDay,
    setStudyHours,
    addSlot,
    removeSlot,
    moveSlot,
    clearDay,
    updateSlotTime,
    updateSlotDuration,
    autoFill,
  } = useCalendar()

  const [viewMode, setViewMode]         = useState('week')
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalDate, setAddModalDate] = useState(null)
  const [editingSlot, setEditingSlot]   = useState(null) // { dateKey, slot }
  const [focusedSlot, setFocusedSlot]   = useState(null) // { dateKey, slotId }
  const [resizing, setResizing]         = useState(null)
  const [tooltip, setTooltip]           = useState(null) // { slot, topic, x, y }
  const dragRef = useRef(null) // { id, date } — avoids stale closure on drop

  // ─── Keyboard events ────────────────────────────────────────────────────
  useEffect(() => {
    function onCalendarKey(e) {
      const key = e.detail?.toLowerCase?.()
      if (key === 'd') setViewMode('day')
      else if (key === 'w') setViewMode('week')
      else if (key === 'm') setViewMode('month')
    }
    window.addEventListener('calendar-key', onCalendarKey)
    return () => window.removeEventListener('calendar-key', onCalendarKey)
  }, [])

  useEffect(() => {
    function onAdd() {
      const date = viewMode === 'day' ? currentDate : (selectedDay || new Date())
      setAddModalDate(date)
      setShowAddModal(true)
    }
    window.addEventListener('add-shortcut', onAdd)
    return () => window.removeEventListener('add-shortcut', onAdd)
  }, [viewMode, currentDate, selectedDay])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Delete' && focusedSlot) {
        removeSlot(focusedSlot.dateKey, focusedSlot.slotId)
        setFocusedSlot(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedSlot, removeSlot])

  // ─── Resize via mouse drag ───────────────────────────────────────────────
  useEffect(() => {
    if (!resizing) return
    function onMove(e) {
      const dy = e.clientY - resizing.startY
      const deltaMins = snap15(Math.round(dy))
      if (resizing.edge === 'bottom') {
        updateSlotDuration(resizing.dateKey, resizing.slotId, Math.max(15, resizing.origDuration + deltaMins))
      } else {
        const newStart = snap15(resizing.origStart + deltaMins)
        const newDur = Math.max(15, resizing.origDuration - (newStart - resizing.origStart))
        updateSlotTime(resizing.dateKey, resizing.slotId, minutesToTime(newStart))
        updateSlotDuration(resizing.dateKey, resizing.slotId, newDur)
      }
    }
    function onUp() { setResizing(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizing, updateSlotTime, updateSlotDuration])

  // ─── Date helpers ────────────────────────────────────────────────────────
  function addDays(date, n) {
    const d = new Date(date); d.setDate(d.getDate() + n); return d
  }
  function startOfWeek(date) {
    const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d
  }
  function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1) }
  function endOfMonth(date)   { return new Date(date.getFullYear(), date.getMonth() + 1, 0) }
  function dateKey(date)      { return date.toISOString().split('T')[0] }
  function fmtDate(date)      { return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

  function handlePrev() {
    if (viewMode === 'day')   setCurrentDate(addDays(currentDate, -1))
    else if (viewMode === 'week')  setCurrentDate(addDays(currentDate, -7))
    else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  function handleNext() {
    if (viewMode === 'day')   setCurrentDate(addDays(currentDate, 1))
    else if (viewMode === 'week')  setCurrentDate(addDays(currentDate, 7))
    else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // ─── Clear / Schedule ────────────────────────────────────────────────────
  function getDaysInScope(scope) {
    if (scope === 'day') return [dateKey(currentDate)]
    if (scope === 'week') {
      const ws = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => dateKey(addDays(ws, i)))
    }
    const ms = startOfMonth(currentDate), me = endOfMonth(currentDate)
    const days = []; let d = new Date(ms)
    while (d <= me) { days.push(dateKey(d)); d.setDate(d.getDate() + 1) }
    return days
  }
  function handleClear(scope)    { getDaysInScope(scope).forEach((dk) => clearDay(dk)) }
  function handleSchedule(scope) {
    getDaysInScope(scope).forEach((dk) => {
      autoFill(dk, allTopics, defaultTopicMins, getTopicMins, getSm2Card, workStart, maxSessionsPerDay)
    })
  }

  // ─── Slot card ───────────────────────────────────────────────────────────
  function SlotCard({ slot, dk, pxPerMin, minTop = 0 }) {
    const topic = allTopics.find((t) => t.id === slot.topicId)
    if (!topic) return null
    const card = getSm2Card(slot.topicId)
    const lastQuality = card?.lastQuality ?? null
    const isFocused = focusedSlot?.dateKey === dk && focusedSlot?.slotId === slot.id
    const startMins = timeToMinutes(slot.startTime)
    const top    = (startMins - minTop) * pxPerMin
    const height = Math.max(22, slot.durationMins * pxPerMin)
    const compact = height < 52

    // Search highlight
    const matchesSearch = searchQuery
      ? topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.courseName.toLowerCase().includes(searchQuery.toLowerCase())
      : true

    return (
      <div
        className={`cal-slot ${isFocused ? 'cal-slot--focused' : ''} ${searchQuery && !matchesSearch ? 'cal-slot--dimmed' : ''}`}
        draggable
        tabIndex={0}
        style={{
          top,
          height,
          position: 'absolute',
          left: 0,
          right: 0,
          background: topic.courseColor,
        }}
        onFocus={() => setFocusedSlot({ dateKey: dk, slotId: slot.id })}
        onBlur={() => setFocusedSlot(null)}
        onDragStart={(e) => {
          dragRef.current = { id: slot.id, date: dk }
          e.dataTransfer.setData('text/plain', JSON.stringify({ id: slot.id, date: dk }))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => { dragRef.current = null }}
        onMouseEnter={(e) => {
          setTooltip({
            slot,
            topic,
            card,
            x: e.clientX,
            y: e.clientY,
          })
        }}
        onMouseLeave={() => setTooltip(null)}
        onClick={(e) => {
          if (e.target.closest('.cal-slot__resize-top,.cal-slot__resize-bottom')) return
          setTooltip(null)
          setEditingSlot({ dateKey: dk, slot })
        }}
      >
        {/* Top resize handle */}
        <div
          className="cal-slot__resize-top"
          onMouseDown={(e) => {
            e.stopPropagation(); e.preventDefault()
            setResizing({ dateKey: dk, slotId: slot.id, edge: 'top', startY: e.clientY,
              origStart: timeToMinutes(slot.startTime), origDuration: slot.durationMins })
          }}
        />

        {compact ? (
          <div className="cal-slot__compact">
            <span className="cal-slot__time">{slot.startTime}</span>
            <span className="cal-slot__compact-name">{topic.name}</span>
          </div>
        ) : (
          <>
            <div className="cal-slot__header">
              <span className="cal-slot__time">{slot.startTime}</span>
              <button className="cal-slot__remove" onClick={(e) => { e.stopPropagation(); removeSlot(dk, slot.id) }}>×</button>
            </div>
            <div className="cal-slot__topic">{topic.name}</div>
            <div className="cal-slot__course">
              <span className="course-badge__dot" style={{ background: topic.courseColor, filter: 'brightness(0.6)' }} />
              <span className="cal-slot__course-name">{topic.courseName}</span>
            </div>
            {height >= 100 && (
              <div className="cal-slot__actions">
                <RateButtons onRate={(q) => rateCard(slot.topicId, q)} card={card} lastQuality={lastQuality} compact />
                {card && (
                  <button className="clear-rating-btn" onClick={(e) => { e.stopPropagation(); clearRating(slot.topicId) }}>✕ rating</button>
                )}
              </div>
            )}
          </>
        )}

        {/* Bottom resize handle */}
        <div
          className="cal-slot__resize-bottom"
          onMouseDown={(e) => {
            e.stopPropagation(); e.preventDefault()
            setResizing({ dateKey: dk, slotId: slot.id, edge: 'bottom', startY: e.clientY,
              origStart: timeToMinutes(slot.startTime), origDuration: slot.durationMins })
          }}
        />
      </div>
    )
  }

  // ─── Drop handler (shared) ───────────────────────────────────────────────
  function makeDropHandler(targetDate, workStartMins, pxPerMin) {
    return (e) => {
      e.preventDefault()
      let info = dragRef.current
      if (!info) {
        try { info = JSON.parse(e.dataTransfer.getData('text/plain')) } catch {}
      }
      if (!info) return
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const rawMins = workStartMins + y / pxPerMin
      const newMins = Math.max(workStartMins, snap15(Math.round(rawMins)))
      moveSlot(info.date, info.id, targetDate, minutesToTime(newMins))
      dragRef.current = null
    }
  }

  // ─── Day View ────────────────────────────────────────────────────────────
  function DayView() {
    const key = dateKey(currentDate)
    const day = getDay(key)
    const workStartMins = timeToMinutes(workStart)
    const workEndMins   = timeToMinutes(workEnd)
    const totalMins     = workEndMins - workStartMins
    const PX = 1.5

    return (
      <div className="cal-day-view">
        <div className="cal-day-header">
          <div className="cal-day-date">{fmtDate(currentDate)}</div>
          <div className="cal-day-controls">
            <input type="number" value={day.studyHours ?? 2} min={1} max={12}
                   onChange={(e) => setStudyHours(key, parseInt(e.target.value))}
                   className="cal-study-hours-input" title="Study hours for this day" />
            <button className="cal-add-day-btn" onClick={() => { setAddModalDate(currentDate); setShowAddModal(true) }}>+ Add Topic</button>
          </div>
        </div>
        <div className="cal-time-grid">
          <div className="cal-time-col">
            {Array.from({ length: Math.ceil(totalMins / 60) }, (_, i) => {
              const mins = workStartMins + i * 60
              return <div key={mins} className="cal-time-slot" style={{ height: 60 * PX }}>{minutesToTime(mins)}</div>
            })}
          </div>
          <div
            className="cal-slot-area"
            style={{ position: 'relative', height: totalMins * PX }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={makeDropHandler(currentDate, workStartMins, PX)}
          >
            {(day.slots || []).map((slot) => (
              <SlotCard key={slot.id} slot={slot} dk={key} pxPerMin={PX} minTop={workStartMins} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Week View ───────────────────────────────────────────────────────────
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
            const key  = dateKey(date)
            const day  = getDay(key)
            return (
              <div key={key} className="cal-day-col">
                <div className="cal-day-col-header">
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                </div>
                <div
                  className="cal-slot-area"
                  style={{ position: 'relative', height: totalMins * PX }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={makeDropHandler(date, workStartMins, PX)}
                >
                  {(day.slots || []).map((slot) => (
                    <SlotCard key={slot.id} slot={slot} dk={key} pxPerMin={PX} minTop={workStartMins} />
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

  // ─── Month View ──────────────────────────────────────────────────────────
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
            const key = dateKey(date)
            const day = getDay(key)
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
            return (
              <div key={key}
                   className={`cal-month-day ${!isCurrentMonth ? 'cal-month-day--other' : ''}`}
                   onClick={() => isCurrentMonth && setSelectedDay(date)}>
                <div className="cal-month-day-num">{date.getDate()}</div>
                <div className="cal-month-chips">
                  {(day.slots || []).slice(0, 2).map((slot) => {
                    const topic = allTopics.find((t) => t.id === slot.topicId)
                    if (!topic) return null
                    const matches = !searchQuery || topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      topic.courseName.toLowerCase().includes(searchQuery.toLowerCase())
                    return (
                      <div key={slot.id} className={`cal-month-chip ${!matches ? 'cal-slot--dimmed' : ''}`}
                           title={topic.name}
                           style={{ borderLeft: `3px solid ${topic.courseColor}`, background: `${topic.courseColor}22` }}>
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
        {selectedDay && (
          <div className="cal-month-day-detail">
            <div className="cal-month-detail-header">
              {fmtDate(selectedDay)}
              <button className="icon-btn" onClick={() => setSelectedDay(null)}>×</button>
            </div>
            {(() => {
              const key = dateKey(selectedDay)
              const day = getDay(key)
              return (
                <div className="cal-month-detail-slots">
                  {(day.slots || []).map((slot) => {
                    const topic = allTopics.find((t) => t.id === slot.topicId)
                    if (!topic) return null
                    return (
                      <div key={slot.id} className="cal-month-detail-slot"
                           onClick={() => setEditingSlot({ dateKey: key, slot })}
                           style={{ cursor: 'pointer' }}>
                        <span className="course-badge__dot" style={{ background: topic.courseColor, display: 'inline-block', marginRight: 4 }} />
                        <span>{slot.startTime} — {topic.name}</span>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); removeSlot(key, slot.id) }}>✕</button>
                      </div>
                    )
                  })}
                  <button className="cal-add-detail-btn"
                          onClick={() => { setAddModalDate(selectedDay); setShowAddModal(true) }}>+ Add</button>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  const scopeLabel = viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month'

  return (
    <div className="calendar-view">
      {/* Tooltip */}
      {tooltip && (
        <div className="cal-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
          <div className="cal-tooltip__title">{tooltip.topic.name}</div>
          <div className="cal-tooltip__course">
            <span className="course-badge__dot" style={{ background: tooltip.topic.courseColor }} />
            {tooltip.topic.courseName}
          </div>
          <div className="cal-tooltip__meta">
            {tooltip.slot.startTime} · {tooltip.slot.durationMins} min
            {tooltip.card?.lastQuality != null && ` · Last: ${{ 0:'Again',3:'Hard',4:'Good',5:'Easy' }[tooltip.card.lastQuality] ?? tooltip.card.lastQuality}`}
          </div>
          {tooltip.topic.notes && <div className="cal-tooltip__notes">{tooltip.topic.notes.slice(0, 80)}{tooltip.topic.notes.length > 80 ? '…' : ''}</div>}
          <div className="cal-tooltip__hint">Click to edit</div>
        </div>
      )}

      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={handlePrev}>← Prev</button>
          <button className="cal-nav-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="cal-nav-btn" onClick={handleNext}>Next →</button>
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
                    className={`cal-view-btn ${viewMode === m ? 'cal-view-btn--active' : ''}`}
                    onClick={() => setViewMode(m)}
                    title={`${m.charAt(0).toUpperCase() + m.slice(1)} view  [${m[0].toUpperCase()}]`}>
              {m[0].toUpperCase()}
            </button>
          ))}
        </div>

        <div className="cal-actions">
          <button className="cal-action-btn cal-action-btn--schedule"
                  onClick={() => handleSchedule(viewMode)}>▶ Schedule {scopeLabel}</button>
          <button className="cal-action-btn cal-action-btn--clear"
                  onClick={() => handleClear(viewMode)}>✕ Clear {scopeLabel}</button>
        </div>
      </div>

      {viewMode === 'day'   && <DayView />}
      {viewMode === 'week'  && <WeekView />}
      {viewMode === 'month' && <MonthView />}

      {/* Add slot modal */}
      {showAddModal && (
        <AddSlotModal
          allTopics={allTopics}
          courses={courses}
          defaultTopicMins={defaultTopicMins}
          workStart={workStart}
          onAdd={(slotData) => addSlot(addModalDate, slotData)}
          onAddCourse={addCourse}
          onAddTopic={addTopic}
          onClose={() => { setShowAddModal(false); setAddModalDate(null) }}
        />
      )}

      {/* Edit slot modal */}
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot.slot}
          topic={allTopics.find((t) => t.id === editingSlot.slot.topicId)}
          onSave={({ startTime, durationMins }) => {
            updateSlotTime(editingSlot.dateKey, editingSlot.slot.id, startTime)
            updateSlotDuration(editingSlot.dateKey, editingSlot.slot.id, durationMins)
          }}
          onRemove={() => removeSlot(editingSlot.dateKey, editingSlot.slot.id)}
          onClose={() => setEditingSlot(null)}
          updateTopicNotes={updateTopicNotes}
        />
      )}
    </div>
  )
}
