import { useState, useCallback } from 'react'
import sampleData from '../data/sample.json'

const EMPTY_RESOURCES = { courseContent: '', video: '', anki: '', testLink: '' }

function storageKey(ns) { return `certTracker_${ns}_certData` }

function load(ns) {
  try {
    const raw = localStorage.getItem(storageKey(ns))
    if (raw) return JSON.parse(raw)
  } catch {}
  return sampleData
}

function save(ns, data) {
  try { localStorage.setItem(storageKey(ns), JSON.stringify(data)) } catch {}
}

export function useCertData(namespace = 'default') {
  const [certData, setCertDataRaw] = useState(() => load(namespace))

  const setCertData = useCallback((updater) => {
    setCertDataRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(namespace, next)
      return next
    })
  }, [namespace])

  const setCertName   = useCallback((name) => setCertData((d) => ({ ...d, certName: name })), [setCertData])
  const setTargetDate = useCallback((date) => setCertData((d) => ({ ...d, targetDate: date })), [setCertData])

  const updateTopicResources = useCallback((topicId, resources) => {
    setCertData((d) => ({
      ...d,
      courses: d.courses.map((c) => ({
        ...c,
        topics: c.topics.map((t) => t.id === topicId ? { ...t, resources } : t),
      })),
    }))
  }, [setCertData])

  const updateTermResources = useCallback((termId, resources) => {
    setCertData((d) => ({
      ...d,
      terminology: d.terminology.map((t) => t.id === termId ? { ...t, resources } : t),
    }))
  }, [setCertData])

  const updateTopicNotes = useCallback((topicId, notes) => {
    setCertData((d) => ({
      ...d,
      courses: d.courses.map((c) => ({
        ...c,
        topics: c.topics.map((t) => t.id === topicId ? { ...t, notes } : t),
      })),
    }))
  }, [setCertData])

  const setTopicDueDate = useCallback((topicId, dueDate, dueTime) => {
    setCertData((d) => ({
      ...d,
      courses: d.courses.map((c) => ({
        ...c,
        topics: c.topics.map((t) =>
          t.id === topicId
            ? { ...t, dueDate: dueDate || null, dueTime: dueTime || null }
            : t
        ),
      })),
    }))
  }, [setCertData])

  const updateTermNotes = useCallback((termId, notes) => {
    setCertData((d) => ({
      ...d,
      terminology: (d.terminology || []).map((t) => t.id === termId ? { ...t, notes } : t),
    }))
  }, [setCertData])

  // ── Add / delete topic ────────────────────────────────────────────────────
  const addTopic = useCallback((courseId, topicData) => {
    setCertData((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id === courseId
          ? { ...c, topics: [...c.topics, { resources: EMPTY_RESOURCES, ...topicData }] }
          : c
      ),
    }))
  }, [setCertData])

  const deleteTopic = useCallback((courseId, topicId) => {
    setCertData((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id === courseId
          ? { ...c, topics: c.topics.filter((t) => t.id !== topicId) }
          : c
      ),
    }))
  }, [setCertData])

  // Assign a stable colour from a small palette when auto-creating courses from CSV
  const COURSE_COLORS = ['#4285F4','#34A853','#FBBC05','#EA4335','#9C27B0','#00BCD4','#FF5722','#607D8B']
  const addCourse = useCallback((courseData) => {
    setCertData((d) => {
      const colorIdx = d.courses.length % COURSE_COLORS.length
      return {
        ...d,
        courses: [...d.courses, {
          color: COURSE_COLORS[colorIdx],
          key: '',
          topics: [],
          ...courseData,
        }],
      }
    })
  }, [setCertData])

  const updateCourse = useCallback((courseId, fields) => {
    setCertData((d) => ({
      ...d,
      courses: d.courses.map((c) => c.id === courseId ? { ...c, ...fields } : c),
    }))
  }, [setCertData])

  const addTerm = useCallback((termData) => {
    setCertData((d) => ({
      ...d,
      terminology: [...(d.terminology || []), { resources: EMPTY_RESOURCES, ...termData }],
    }))
  }, [setCertData])

  const deleteTerm = useCallback((termId) => {
    setCertData((d) => ({
      ...d,
      terminology: (d.terminology || []).filter((t) => t.id !== termId),
    }))
  }, [setCertData])

  // ── Restore (for undo/redo) ───────────────────────────────────────────────
  const restoreCertData = useCallback((data) => { setCertData(data) }, [setCertData])

  // ── Import / export ───────────────────────────────────────────────────────
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(certData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cert-tracker-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [certData])

  const importData = useCallback((jsonString) => {
    const parsed = JSON.parse(jsonString)
    if (!parsed.certName || !Array.isArray(parsed.courses)) {
      throw new Error('Invalid cert data: must have certName and courses array')
    }
    setCertData(parsed)
  }, [setCertData])

  const resetToSample = useCallback(() => { setCertData(sampleData) }, [setCertData])

  // ── Derived helpers ───────────────────────────────────────────────────────
  const getAllTopics = useCallback(() =>
    certData.courses.flatMap((c) =>
      c.topics.map((t) => ({ ...t, courseId: c.id, courseName: c.name, courseColor: c.color }))
    ),
  [certData])

  const getCourseById = useCallback((id) => certData.courses.find((c) => c.id === id), [certData])

  return {
    certData,
    setCertName, setTargetDate,
    updateTopicResources, updateTermResources,
    addTopic, deleteTopic,
    addCourse, updateCourse, addTerm, deleteTerm,
    exportData, importData, resetToSample,
    getAllTopics, getCourseById,
    updateTopicNotes, updateTermNotes,
    setTopicDueDate,
    restoreCertData,
  }
}
