import { useState, useCallback } from 'react'
import { daysUntilDue } from '../utils/sm2'

const STORAGE_KEY = 'certTracker_calendar'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export function useCalendar() {
  const [calendar, setCalendarRaw] = useState(load)

  const setCalendar = useCallback((updater) => {
    setCalendarRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [])

  const getDay = useCallback((date) => {
    const key = date instanceof Date ? date.toISOString().split('T')[0] : date
    return calendar[key] || { studyHours: null, slots: [] }
  }, [calendar])

  const setStudyHours = useCallback((date, hours) => {
    const key = date instanceof Date ? date.toISOString().split('T')[0] : date
    setCalendar((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { slots: [] }), studyHours: hours },
    }))
  }, [setCalendar])

  const addSlot = useCallback((date, slot) => {
    const key = date instanceof Date ? date.toISOString().split('T')[0] : date
    setCalendar((prev) => {
      const day = prev[key] || { studyHours: null, slots: [] }
      const id = `slot-${Date.now()}-${Math.random()}`
      return {
        ...prev,
        [key]: {
          ...day,
          slots: [...day.slots, { id, ...slot }],
        },
      }
    })
  }, [setCalendar])

  const removeSlot = useCallback((date, slotId) => {
    const key = date instanceof Date ? date.toISOString().split('T')[0] : date
    setCalendar((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { studyHours: null, slots: [] }),
        slots: (prev[key]?.slots || []).filter((s) => s.id !== slotId),
      },
    }))
  }, [setCalendar])

  const moveSlot = useCallback((fromDate, slotId, toDate, newStartTime) => {
    const fromKey = fromDate instanceof Date ? fromDate.toISOString().split('T')[0] : fromDate
    const toKey = toDate instanceof Date ? toDate.toISOString().split('T')[0] : toDate
    setCalendar((prev) => {
      const fromDay = prev[fromKey] || { studyHours: null, slots: [] }
      const toDay = prev[toKey] || { studyHours: null, slots: [] }
      const slot = fromDay.slots.find((s) => s.id === slotId)
      if (!slot) return prev
      return {
        ...prev,
        [fromKey]: {
          ...fromDay,
          slots: fromDay.slots.filter((s) => s.id !== slotId),
        },
        [toKey]: {
          ...toDay,
          slots: [...toDay.slots, { ...slot, startTime: newStartTime }],
        },
      }
    })
  }, [setCalendar])

  const autoFill = useCallback((date, topics, defaultMins, getTopicMins, getSm2Card) => {
    const key = date instanceof Date ? date.toISOString().split('T')[0] : date
    const day = calendar[key] || { studyHours: null, slots: [] }
    const studyHours = day.studyHours ?? 2
    const totalMins = studyHours * 60

    // Sort topics by daysUntilDue (most overdue first)
    const sorted = [...topics].sort((a, b) => {
      const da = daysUntilDue(getSm2Card(a.id))
      const db = daysUntilDue(getSm2Card(b.id))
      return da - db
    })

    const newSlots = []
    let currentMins = 0

    for (const topic of sorted) {
      if (currentMins >= totalMins) break
      const topicMins = getTopicMins(topic.id) ?? defaultMins
      if (currentMins + topicMins <= totalMins) {
        const hours = Math.floor(currentMins / 60)
        const mins = currentMins % 60
        const startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
        newSlots.push({
          id: `slot-${Date.now()}-${Math.random()}`,
          topicId: topic.id,
          startTime,
          durationMins: topicMins,
        })
        currentMins += topicMins
      }
    }

    setCalendar((prev) => ({
      ...prev,
      [key]: { studyHours, slots: newSlots },
    }))
  }, [calendar, setCalendar])

  const exportCSV = useCallback((allTopics, certData) => {
    const rows = [['Date', 'StartTime', 'DurationMins', 'TopicId', 'TopicName', 'CourseName'].join(',')]

    const getCourseNameByTopicId = (topicId) => {
      for (const course of certData.courses) {
        const topic = course.topics.find((t) => t.id === topicId)
        if (topic) return { name: topic.name, courseName: course.name }
      }
      return { name: '', courseName: '' }
    }

    for (const [dateKey, day] of Object.entries(calendar)) {
      for (const slot of day.slots || []) {
        const { name, courseName } = getCourseNameByTopicId(slot.topicId)
        const row = [
          dateKey,
          slot.startTime,
          slot.durationMins,
          slot.topicId,
          `"${name.replace(/"/g, '""')}"`,
          `"${courseName.replace(/"/g, '""')}"`,
        ]
        rows.push(row.join(','))
      }
    }

    return rows.join('\n')
  }, [calendar])

  return {
    calendar,
    getDay,
    setStudyHours,
    addSlot,
    removeSlot,
    moveSlot,
    autoFill,
    exportCSV,
  }
}
