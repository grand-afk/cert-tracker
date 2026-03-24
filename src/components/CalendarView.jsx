import { useState, useEffect, useRef } from 'react'
import { useCalendar } from '../hooks/useCalendar'
import { daysUntilDue } from '../utils/sm2'

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function CalendarView({
  allTopics,
  getSm2Card,
  getStatus,
  getTopicMins,
  workStart,
  workEnd,
  defaultTopicMins,
}) {
  const { getDay, setStudyHours, addSlot, removeSlot, moveSlot, exportCSV } = useCalendar()
  const [viewMode, setViewMode] = useState('week') // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [draggedSlot, setDraggedSlot] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalDate, setAddModalDate] = useState(null)
  const [addModalTime, setAddModalTime] = useState('09:00')
  const [addModalTopicId, setAddModalTopicId] = useState('')
  const calendarRef = useRef(null)

  // Listen for calendar key events from App
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

  function handleExportCSV() {
    const csv = exportCSV(allTopics, { courses: [] })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `calendar-${Date.now()}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Day View ─────────────────────────────────────────────────────────────
  function DayView() {
    const key = dateKey(currentDate)
    const day = getDay(key)
    const workStartMins = timeToMinutes(workStart)
    const workEndMins = timeToMinutes(workEnd)

    return (
      <div className="cal-day-view">
        <div className="cal-day-header">
          <div className="cal-day-date">{formatDate(currentDate)}</div>
          <div className="cal-day-controls">
            <input type="number" value={day.studyHours ?? 2} min={1} max={12}
                   onChange={(e) => setStudyHours(key, parseInt(e.target.value))}
                   className="cal-study-hours-input" title="Study hours for this day" />
            <button className="cal-add-topic-btn" onClick={() => { setAddModalDate(currentDate); setShowAddModal(true) }}>+ Add Topic</button>
          </div>
        </div>

        <div className="cal-time-grid">
          <div className="cal-time-col">
            {Array.from({ length: workEndMins - workStartMins }, (_, i) => {
              const mins = workStartMins + i * 60
              return <div key={mins} className="cal-time-slot">{minutesToTime(mins)}</div>
            })}
          </div>
          <div className="cal-slot-area"
               onDragOver={(e) => e.preventDefault()}
               onDrop={(e) => {
                 e.preventDefault()
                 if (draggedSlot) {
                   const rect = e.currentTarget.getBoundingClientRect()
                   const y = e.clientY - rect.top
                   const slot = Math.max(0, Math.floor(y / 60))
                   const newMins = workStartMins + slot * 60
                   moveSlot(draggedSlot.date, draggedSlot.id, currentDate, minutesToTime(newMins))
                   setDraggedSlot(null)
                 }
               }}>
            {(day.slots || []).map((slot) => {
              const topic = allTopics.find((t) => t.id === slot.topicId)
              if (!topic) return null
              const startMins = timeToMinutes(slot.startTime)
              const top = ((startMins - workStartMins) / 60) * 60
              const height = (slot.durationMins / 60) * 60
              return (
                <div key={slot.id} className="cal-slot"
                     draggable
                     onDragStart={() => setDraggedSlot({ id: slot.id, date: currentDate })}
                     onDragEnd={() => setDraggedSlot(null)}
                     style={{ top, height }}
                     title={topic.name}>
                  <div className="cal-slot__time">{slot.startTime}</div>
                  <div className="cal-slot__name">{topic.name}</div>
                  <button className="cal-slot__remove" onClick={() => removeSlot(key, slot.id)}>×</button>
                </div>
              )
            })}
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

    return (
      <div className="cal-week-view">
        <div className="cal-week-grid">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i)
            const key = dateKey(date)
            const day = getDay(key)
            return (
              <div key={key} className="cal-day-col">
                <div className="cal-day-col-header">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>
                <div className="cal-time-grid">
                  <div className="cal-slot-area"
                       onDragOver={(e) => e.preventDefault()}
                       onDrop={(e) => {
                         e.preventDefault()
                         if (draggedSlot && draggedSlot.date !== key) {
                           const rect = e.currentTarget.getBoundingClientRect()
                           const y = e.clientY - rect.top
                           const slot = Math.max(0, Math.floor(y / 50))
                           const newMins = workStartMins + slot * 60
                           moveSlot(draggedSlot.date, draggedSlot.id, date, minutesToTime(newMins))
                           setDraggedSlot(null)
                         }
                       }}>
                    {(day.slots || []).map((slot) => {
                      const topic = allTopics.find((t) => t.id === slot.topicId)
                      if (!topic) return null
                      const startMins = timeToMinutes(slot.startTime)
                      const top = ((startMins - workStartMins) / 60) * 50
                      const height = (slot.durationMins / 60) * 50
                      return (
                        <div key={slot.id} className="cal-slot cal-slot--week"
                             draggable
                             onDragStart={() => setDraggedSlot({ id: slot.id, date: key })}
                             onDragEnd={() => setDraggedSlot(null)}
                             style={{ top, height }}
                             title={`${topic.name} at ${slot.startTime}`}>
                          <div className="cal-slot__name">{topic.name}</div>
                          <button className="cal-slot__remove" onClick={() => removeSlot(key, slot.id)}>×</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <button className="cal-add-day-btn" onClick={() => { setAddModalDate(date); setShowAddModal(true) }}>+</button>
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
              <div key={key} className={`cal-month-day ${!isCurrentMonth ? 'cal-month-day--other' : ''}`}
                   onClick={() => isCurrentMonth && setSelectedDay(date)}>
                <div className="cal-month-day-num">{date.getDate()}</div>
                <div className="cal-month-chips">
                  {(day.slots || []).slice(0, 2).map((slot) => {
                    const topic = allTopics.find((t) => t.id === slot.topicId)
                    if (!topic) return null
                    return (
                      <div key={slot.id} className="cal-month-chip" title={topic.name}>
                        {topic.name.substring(0, 10)}
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
                        <div>{slot.startTime} - {topic.name}</div>
                        <button className="icon-btn" onClick={() => removeSlot(key, slot.id)}>✕</button>
                      </div>
                    )
                  })}
                  <button className="cal-add-detail-btn" onClick={() => { setAddModalDate(selectedDay); setShowAddModal(true) }}>+ Add</button>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

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
          <button className={`cal-view-btn ${viewMode === 'day' ? 'cal-view-btn--active' : ''}`}
                  onClick={() => setViewMode('day')} title="Day view  [D]">D</button>
          <button className={`cal-view-btn ${viewMode === 'week' ? 'cal-view-btn--active' : ''}`}
                  onClick={() => setViewMode('week')} title="Week view  [W]">W</button>
          <button className={`cal-view-btn ${viewMode === 'month' ? 'cal-view-btn--active' : ''}`}
                  onClick={() => setViewMode('month')} title="Month view  [M]">M</button>
        </div>

        <button className="cal-export-btn" onClick={handleExportCSV}>⬇ CSV</button>
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
              <select className="form-input" value={addModalTopicId} onChange={(e) => setAddModalTopicId(e.target.value)}>
                <option value="">Select a topic...</option>
                {allTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" className="form-input" value={addModalTime} onChange={(e) => setAddModalTime(e.target.value)} />
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
