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

export default function CalendarView({
  allTopics,
  getSm2Card,
  getStatus,
  getTopicMins,
  workStart,
  workEnd,
  defaultTopicMins,
  rateCard,
  clearRating,
  maxSessionsPerDay,
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

  const [viewMode, setViewMode] = useState('week') // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [draggedSlot, setDraggedSlot] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalDate, setAddModalDate] = useState(null)
  const [addModalTime, setAddModalTime] = useState('09:00')
  const [addModalTopicId, setAddModalTopicId] = useState('')
  const [focusedSlot, setFocusedSlot] = useState(null) // { dateKey, slotId }
  const [resizing, setResizing] = useState(null) // { dateKey, slotId, edge: 'top'|'bottom', startY, origMins, origDuration }
  const calendarRef = useRef(null)

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
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

  // Delete key removes focused slot
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

  // ─── Resize via mouse drag ────────────────────────────────────────────────
  useEffect(() => {
    if (!resizing) return
    function onMove(e) {
      const dy = e.clientY - resizing.startY
      const deltaMins = snap15(Math.round(dy))
      if (resizing.edge === 'bottom') {
        const newDur = Math.max(15, resizing.origDuration + deltaMins)
        updateSlotDuration(resizing.dateKey, resizing.slotId, newDur)
      } else {
        // top handle: shift start time + shrink duration
        const newStart = snap15(resizing.origStart + deltaMins)
        const newDur = Math.max(15, resizing.origDuration - (newStart - resizing.origStart))
        if (newDur >= 15) {
          updateSlotTime(resizing.dateKey, resizing.slotId, minutesToTime(newStart))
          updateSlotDuration(resizing.dateKey, resizing.slotId, newDur)
        }
      }
    }
    function onUp() { setResizing(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, updateSlotTime, updateSlotDuration])

  // ─── Date helpers ─────────────────────────────────────────────────────────
  function addDays(date, n) {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
  }

  function startOfWeek(date) {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  }

  function dateKey(date) {
    return date.toISOString().split('T')[0]
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function handlePrevious() {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, -1))
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7))
    else if (viewMode === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function handleNext() {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7))
    else if (viewMode === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  // ─── Clear / Schedule ─────────────────────────────────────────────────────
  function getDaysInScope(scope) {
    if (scope === 'day') return [dateKey(currentDate)]
    if (scope === 'week') {
      const ws = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => dateKey(addDays(ws, i)))
    }
    if (scope === 'month') {
      const ms = startOfMonth(currentDate)
      const me = endOfMonth(currentDate)
      const days = []
      let d = new Date(ms)
      while (d <= me) { days.push(dateKey(d)); d.setDate(d.getDate() + 1) }
      return days
    }
    return []
  }

  function handleClear(scope) {
    getDaysInScope(scope).forEach((dk) => clearDay(dk))
  }

  function handleSchedule(scope) {
    const days = getDaysInScope(scope)
    days.forEach((dk) => {
      autoFill(dk, allTopics, defaultTopicMins, getTopicMins, getSm2Card, workStart, maxSessionsPerDay)
    })
  }

  // ─── Add slot modal ───────────────────────────────────────────────────────
  function handleAddSlot() {
    if (!addModalDate || !addModalTopicId) return
    const durationMins = getTopicMins(addModalTopicId) ?? defaultTopicMins
    addSlot(addModalDate, {
      topicId: addModalTopicId,
      startTime: addModalTime,
      durationMins,
    })
    setShowAddModal(false)
    setAddModalTime('09:00')
    setAddModalTopicId('')
    setAddModalDate(null)
  }

  // ─── Slot card ────────────────────────────────────────────────────────────
  function SlotCard({ slot, dateKey: dk, pxPerMin, minTop = 0 }) {
    const topic = allTopics.find((t) => t.id === slot.topicId)
    if (!topic) return null
    const card = getSm2Card(slot.topicId)
    const lastQuality = card?.lastQuality ?? null
    const isFocused = focusedSlot?.dateKey === dk && focusedSlot?.slotId === slot.id
    const startMins = timeToMinutes(slot.startTime)
    const top = (startMins - minTop) * pxPerMin
    const height = Math.max(30, slot.durationMins * pxPerMin)

    return (
      <div
        key={slot.id}
        className={`cal-slot${isFocused ? ' cal-slot--focused' : ''}`}
        draggable
        tabIndex={0}
        onFocus={() => setFocusedSlot({ dateKey: dk, slotId: slot.id })}
        onBlur={() => setFocusedSlot(null)}
        onDragStart={() => setDraggedSlot({ id: slot.id, date: dk })}
        onDragEnd={() => setDraggedSlot(null)}
        style={{ top, height, position: 'absolute', left: 0, right: 0 }}
        title={topic.name}
      >
        {/* Top resize handle */}
        <div
          className="cal-slot__resize-top"
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setResizing({
              dateKey: dk,
              slotId: slot.id,
              edge: 'top',
              startY: e.clientY,
              origStart: timeToMinutes(slot.startTime),
              origDuration: slot.durationMins,
            })
          }}
        />

        <div className="cal-slot__header">
          <span className="cal-slot__time">{slot.startTime}</span>
          <button
            className="cal-slot__remove"
            onClick={(e) => { e.stopPropagation(); removeSlot(dk, slot.id) }}
            title="Remove"
          >×</button>
        </div>

        <div className="cal-slot__topic">{topic.name}</div>

        <div className="cal-slot__course">
          <span className="course-badge__dot" style={{ background: topic.courseColor }} />
          <span className="cal-slot__course-name">{topic.courseName}</span>
        </div>

        {height >= 80 && (
          <div className="cal-slot__actions">
            <RateButtons
              onRate={(q) => rateCard(slot.topicId, q)}
              card={card}
              lastQuality={lastQuality}
              compact
            />
            {card && (
              <button
                className="clear-rating-btn"
                onClick={(e) => { e.stopPropagation(); clearRating(slot.topicId) }}
                title="Clear rating"
              >✕ rating</button>
            )}
          </div>
        )}

        {/* Bottom resize handle */}
        <div
          className="cal-slot__resize-bottom"
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setResizing({
              dateKey: dk,
              slotId: slot.id,
              edge: 'bottom',
              startY: e.clientY,
              origStart: timeToMinutes(slot.startTime),
              origDuration: slot.durationMins,
            })
          }}
        />
      </div>
    )
  }

  // ─── Day View ─────────────────────────────────────────────────────────────
  function DayView() {
    const key = dateKey(currentDate)
    const day = getDay(key)
    const workStartMins = timeToMinutes(workStart)
    const workEndMins = timeToMinutes(workEnd)
    const totalMins = workEndMins - workStartMins
    const PX_PER_MIN = 1.5 // 90px per hour

    return (
      <div className="cal-day-view">
        <div className="cal-day-header">
          <div className="cal-day-date">{formatDate(currentDate)}</div>
          <div className="cal-day-controls">
            <input
              type="number"
              value={day.studyHours ?? 2}
              min={1}
              max={12}
              onChange={(e) => setStudyHours(key, parseInt(e.target.value))}
              className="cal-study-hours-input"
              title="Study hours for this day"
            />
            <button className="cal-add-topic-btn" onClick={() => { setAddModalDate(currentDate); setShowAddModal(true) }}>+ Add Topic</button>
          </div>
        </div>

        <div className="cal-time-grid">
          <div className="cal-time-col">
            {Array.from({ length: Math.ceil((workEndMins - workStartMins) / 60) }, (_, i) => {
              const mins = workStartMins + i * 60
              return (
                <div key={mins} className="cal-time-slot" style={{ height: 60 * PX_PER_MIN }}>
                  {minutesToTime(mins)}
                </div>
              )
            })}
          </div>
          <div
            className="cal-slot-area"
            style={{ position: 'relative', height: totalMins * PX_PER_MIN }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedSlot) {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const newMins = snap15(workStartMins + Math.round(y / PX_PER_MIN))
                moveSlot(draggedSlot.date, draggedSlot.id, currentDate, minutesToTime(newMins))
                setDraggedSlot(null)
              }
            }}
          >
            {(day.slots || []).map((slot) => (
              <SlotCard key={slot.id} slot={slot} dateKey={key} pxPerMin={PX_PER_MIN} minTop={workStartMins} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Week View ────────────────────────────────────────────────────────────
  function WeekView() {
    const weekStart = startOfWeek(currentDate)
    const workStartMins = timeToMinutes(workStart)
    const workEndMins = timeToMinutes(workEnd)
    const totalMins = workEndMins - workStartMins
    const PX_PER_MIN = 1.0 // 60px per hour

    return (
      <div className="cal-week-view">
        <div className="cal-week-grid">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i)
            const key = dateKey(date)
            const day = getDay(key)
            return (
              <div key={key} className="cal-day-col">
                <div className="cal-day-col-header">
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                </div>
                <div
                  className="cal-slot-area"
                  style={{ position: 'relative', height: totalMins * PX_PER_MIN }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedSlot) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const newMins = snap15(workStartMins + Math.round(y / PX_PER_MIN))
                      moveSlot(draggedSlot.date, draggedSlot.id, date, minutesToTime(newMins))
                      setDraggedSlot(null)
                    }
                  }}
                >
                  {(day.slots || []).map((slot) => (
                    <SlotCard key={slot.id} slot={slot} dateKey={key} pxPerMin={PX_PER_MIN} minTop={workStartMins} />
                  ))}
                </div>
                <button
                  className="cal-add-day-btn"
                  onClick={() => { setAddModalDate(date); setShowAddModal(true) }}
                >+</button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Month View ───────────────────────────────────────────────────────────
  function MonthView() {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const displayStart = startOfWeek(monthStart)
    const days = []
    let d = new Date(displayStart)
    while (d <= monthEnd) {
      days.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }

    return (
      <div className="cal-month-view">
        <div className="cal-month-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
            <div key={name} className="cal-month-weekday">{name}</div>
          ))}
        </div>
        <div className="cal-month-grid">
          {days.map((date) => {
            const key = dateKey(date)
            const day = getDay(key)
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
            return (
              <div
                key={key}
                className={`cal-month-day ${!isCurrentMonth ? 'cal-month-day--other' : ''}`}
                onClick={() => isCurrentMonth && setSelectedDay(date)}
              >
                <div className="cal-month-day-num">{date.getDate()}</div>
                <div className="cal-month-chips">
                  {(day.slots || []).slice(0, 2).map((slot) => {
                    const topic = allTopics.find((t) => t.id === slot.topicId)
                    if (!topic) return null
                    return (
                      <div
                        key={slot.id}
                        className="cal-month-chip"
                        title={topic.name}
                        style={{ borderLeft: `3px solid ${topic.courseColor}` }}
                      >
                        {topic.name.substring(0, 12)}
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
              {formatDate(selectedDay)}
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
                      <div key={slot.id} className="cal-month-detail-slot">
                        <span
                          className="course-badge__dot"
                          style={{ background: topic.courseColor, display: 'inline-block', marginRight: 4 }}
                        />
                        <span>{slot.startTime} — {topic.name}</span>
                        <button className="icon-btn" onClick={() => removeSlot(key, slot.id)}>✕</button>
                      </div>
                    )
                  })}
                  <button
                    className="cal-add-detail-btn"
                    onClick={() => { setAddModalDate(selectedDay); setShowAddModal(true) }}
                  >+ Add</button>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const scopeLabel = viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month'

  return (
    <div className="calendar-view" ref={calendarRef}>
      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={handlePrevious}>← Prev</button>
          <button className="cal-nav-btn" onClick={handleToday}>Today</button>
          <button className="cal-nav-btn" onClick={handleNext}>Next →</button>
        </div>

        <div className="cal-date-label">
          {viewMode === 'day' && formatDate(currentDate)}
          {viewMode === 'week' && (() => {
            const ws = startOfWeek(currentDate)
            const we = addDays(ws, 6)
            return `${formatDate(ws)} – ${formatDate(we)}`
          })()}
          {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        <div className="cal-view-buttons">
          <button
            className={`cal-view-btn ${viewMode === 'day' ? 'cal-view-btn--active' : ''}`}
            onClick={() => setViewMode('day')}
            title="Day view  [D]"
          >D</button>
          <button
            className={`cal-view-btn ${viewMode === 'week' ? 'cal-view-btn--active' : ''}`}
            onClick={() => setViewMode('week')}
            title="Week view  [W]"
          >W</button>
          <button
            className={`cal-view-btn ${viewMode === 'month' ? 'cal-view-btn--active' : ''}`}
            onClick={() => setViewMode('month')}
            title="Month view  [M]"
          >M</button>
        </div>

        <div className="cal-actions">
          <button
            className="cal-action-btn cal-action-btn--schedule"
            onClick={() => handleSchedule(viewMode)}
            title={`Auto-fill ${scopeLabel} with due topics`}
          >▶ Schedule {scopeLabel}</button>
          <button
            className="cal-action-btn cal-action-btn--clear"
            onClick={() => handleClear(viewMode)}
            title={`Clear all slots for this ${scopeLabel.toLowerCase()}`}
          >✕ Clear {scopeLabel}</button>
        </div>
      </div>

      {viewMode === 'day' && <DayView />}
      {viewMode === 'week' && <WeekView />}
      {viewMode === 'month' && <MonthView />}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add Topic to Schedule</div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <select
                className="form-input"
                value={addModalTopicId}
                onChange={(e) => setAddModalTopicId(e.target.value)}
              >
                <option value="">Select a topic...</option>
                {allTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-input"
                value={addModalTime}
                onChange={(e) => setAddModalTime(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSlot} disabled={!addModalTopicId}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
