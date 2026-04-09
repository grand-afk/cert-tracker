import { useState, useCallback } from 'react'
import { daysUntilDue } from '../utils/sm2'

function storageKey(ns) { return `certTracker_${ns}_calendar` }

// Local-date key — avoids UTC conversion shifting dates for non-UTC timezones
function localDk(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toKey(date) { return date instanceof Date ? localDk(date) : date }

function load(ns) {
  try {
    const raw = localStorage.getItem(storageKey(ns))
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function save(ns, data) {
  try { localStorage.setItem(storageKey(ns), JSON.stringify(data)) } catch {}
}

export function useCalendar(namespace = 'default') {
  const [calendar, setCalendarRaw] = useState(() => load(namespace))

  const setCalendar = useCallback((updater) => {
    setCalendarRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(namespace, next)
      return next
    })
  }, [namespace])

  const getDay = useCallback((date) => {
    const key = toKey(date)
    return calendar[key] || { studyHours: null, slots: [] }
  }, [calendar])

  const setStudyHours = useCallback((date, hours) => {
    const key = toKey(date)
    setCalendar((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { slots: [] }), studyHours: hours },
    }))
  }, [setCalendar])

  const addSlot = useCallback((date, slot) => {
    const key = toKey(date)
    setCalendar((prev) => {
      const day = prev[key] || { studyHours: null, slots: [] }
      // Preserve provided id for undo/redo; otherwise generate a new one
      const id = slot.id ?? `slot-${Date.now()}-${Math.random()}`
      const slotData = slot.id ? slot : { id, ...slot }
      return {
        ...prev,
        [key]: {
          ...day,
          slots: [...day.slots, slotData],
        },
      }
    })
  }, [setCalendar])

  const removeSlot = useCallback((date, slotId) => {
    const key = toKey(date)
    setCalendar((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { studyHours: null, slots: [] }),
        slots: (prev[key]?.slots || []).filter((s) => s.id !== slotId),
      },
    }))
  }, [setCalendar])

  const moveSlot = useCallback((fromDate, slotId, toDate, newStartTime) => {
    const fromKey = toKey(fromDate)
    const destKey = toKey(toDate)
    setCalendar((prev) => {
      const fromDay = prev[fromKey] || { studyHours: null, slots: [] }
      const slot = fromDay.slots.find((s) => s.id === slotId)
      if (!slot) return prev
      const updatedSlot = { ...slot, startTime: newStartTime }
      // Same-day drag: just update the start time in place (don't duplicate)
      if (fromKey === destKey) {
        return {
          ...prev,
          [fromKey]: {
            ...fromDay,
            slots: fromDay.slots.map((s) => s.id === slotId ? updatedSlot : s),
          },
        }
      }
      const toDay = prev[destKey] || { studyHours: null, slots: [] }
      return {
        ...prev,
        [fromKey]: {
          ...fromDay,
          slots: fromDay.slots.filter((s) => s.id !== slotId),
        },
        [destKey]: {
          ...toDay,
          slots: [...toDay.slots, updatedSlot],
        },
      }
    })
  }, [setCalendar])

  const clearDay = useCallback((dateKey) => {
    setCalendar((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || {}), slots: [] },
    }))
  }, [setCalendar])

  const updateSlotTime = useCallback((dateKey, slotId, newStartTime) => {
    setCalendar((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { studyHours: null }),
        slots: (prev[dateKey]?.slots || []).map((s) =>
          s.id === slotId ? { ...s, startTime: newStartTime } : s
        ),
      },
    }))
  }, [setCalendar])

  const updateSlotDuration = useCallback((dateKey, slotId, durationMins) => {
    setCalendar((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { studyHours: null }),
        slots: (prev[dateKey]?.slots || []).map((s) =>
          s.id === slotId ? { ...s, durationMins: Math.max(15, durationMins) } : s
        ),
      },
    }))
  }, [setCalendar])

  const importCSV = useCallback((csvText, allTopics) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return
    const newData = {}
    lines.slice(1).forEach((line) => {
      const parts = line.split(',')
      if (parts.length < 4) return
      const [dateKey, startTime, durationMins, topicId] = parts
      if (!dateKey || !topicId) return
      if (!newData[dateKey]) newData[dateKey] = { studyHours: null, slots: [] }
      newData[dateKey].slots.push({
        id: `slot-${Date.now()}-${Math.random()}`,
        topicId: topicId.trim(),
        startTime: startTime.trim(),
        durationMins: parseInt(durationMins) || 30,
      })
    })
    setCalendar((prev) => ({ ...prev, ...newData }))
  }, [setCalendar])

  const autoFill = useCallback((dateKey, topics, defaultMins, getTopicMins, getSm2Card, workStart, workEnd, maxSessions, breakMins = 0) => {
    const key = toKey(dateKey)
    const [wh, wm] = workStart.split(':').map(Number)
    const workStartMins = wh * 60 + wm
    const [eh, em] = (workEnd || '17:00').split(':').map(Number)
    const workEndMins = eh * 60 + em
    const totalMins = workEndMins - workStartMins  // use full work window

    const day = calendar[key] || { studyHours: null, slots: [] }
    const studyHours = day.studyHours ?? 2
    const max = maxSessions ?? 10

    // Group topics by courseId, each group sorted most-overdue first
    const byCourse = {}
    topics.forEach((t) => {
      if (!byCourse[t.courseId]) byCourse[t.courseId] = []
      byCourse[t.courseId].push(t)
    })
    Object.values(byCourse).forEach((group) =>
      group.sort((a, b) => daysUntilDue(getSm2Card(a.id)) - daysUntilDue(getSm2Card(b.id)))
    )
    // Pointers per course
    const courseIds = Object.keys(byCourse)
    const pointers = {}
    courseIds.forEach((cid) => { pointers[cid] = 0 })

    const newSlots = []
    let elapsed = 0
    let rounds = 0
    const maxRounds = Math.ceil(max / Math.max(1, courseIds.length)) + 1

    outer: while (rounds < maxRounds) {
      let addedThisRound = false
      for (const cid of courseIds) {
        if (elapsed >= totalMins) break outer
        if (newSlots.length >= max) break outer
        const group = byCourse[cid]
        const ptr = pointers[cid]
        if (ptr >= group.length) continue
        const topic = group[ptr]
        pointers[cid]++
        const topicMins = getTopicMins(topic.id) ?? defaultMins
        if (elapsed + topicMins <= totalMins) {
          const absMins = workStartMins + elapsed
          newSlots.push({
            id: `slot-${Date.now()}-${Math.random()}`,
            topicId: topic.id,
            startTime: `${String(Math.floor(absMins / 60)).padStart(2, '0')}:${String(absMins % 60).padStart(2, '0')}`,
            durationMins: topicMins,
          })
          elapsed += topicMins + (breakMins || 0)
          addedThisRound = true
        }
      }
      if (!addedThisRound) break
      rounds++
    }

    setCalendar((prev) => ({
      ...prev,
      [key]: { ...prev[key], studyHours, slots: newSlots },
    }))
  }, [calendar, setCalendar])

  // ── Restore (for undo/redo) ───────────────────────────────────────────────
  const restoreCalendar = useCallback((data) => { setCalendar(data) }, [setCalendar])

  // Set slots for multiple days in a single state update (used by week/month scheduling)
  const batchSetSlots = useCallback((updates) => {
    // updates: { [dateKey]: { studyHours, slots } }
    setCalendar((prev) => {
      const next = { ...prev }
      Object.entries(updates).forEach(([dk, data]) => {
        next[dk] = { ...(prev[dk] || {}), ...data }
      })
      return next
    })
  }, [setCalendar])

  const exportCSV = useCallback((allTopics, certData, progress) => {
    const headers = [
      'Date', 'StartTime', 'DurationMins',
      'TopicId', 'TopicName', 'CourseName',
      'Rating', 'Notes',
      'CourseContentUrl', 'VideoUrl', 'AnkiUrl', 'TestUrl',
    ]
    const rows = [headers.join(',')]

    const QUALITY_LABELS = { 0: 'Again', 3: 'Hard', 4: 'Good', 5: 'Easy' }

    const getTopicInfo = (topicId) => {
      if (allTopics) {
        const t = allTopics.find((t) => t.id === topicId)
        if (t) return {
          name: t.name, courseName: t.courseName,
          notes: t.notes ?? '',
          resources: t.resources || {},
        }
      }
      for (const course of certData.courses) {
        const topic = course.topics.find((t) => t.id === topicId)
        if (topic) return {
          name: topic.name, courseName: course.name,
          notes: topic.notes ?? '',
          resources: topic.resources || {},
        }
      }
      return { name: '', courseName: '', notes: '', resources: {} }
    }

    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`

    for (const [dateKey, day] of Object.entries(calendar)) {
      for (const slot of day.slots || []) {
        const { name, courseName, notes, resources } = getTopicInfo(slot.topicId)
        const sm2 = progress?.[slot.topicId]?.sm2
        const rating = sm2?.lastQuality != null ? (QUALITY_LABELS[sm2.lastQuality] ?? sm2.lastQuality) : ''
        const row = [
          dateKey,
          slot.startTime,
          slot.durationMins,
          slot.topicId,
          q(name),
          q(courseName),
          q(rating),
          q(notes),
          q(resources.courseContent),
          q(resources.video),
          q(resources.anki),
          q(resources.testLink),
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
    clearDay,
    updateSlotTime,
    updateSlotDuration,
    importCSV,
    autoFill,
    batchSetSlots,
    exportCSV,
    restoreCalendar,
  }
}
