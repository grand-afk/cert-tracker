import { useState, useCallback, useEffect } from 'react'

const DEFAULTS = {
  darkMode: true,
  selectedCourses: [],  // empty = show all
  workStart: '09:00',
  workEnd: '17:00',
  defaultTopicMins: 30,
  maxSessionsPerDay: 5,
  defaultBreakMins: 0,
  subtopicsEnabled: false,  // optional sub-topic level (configurable per cert)
  // Sync metadata
  lastSaved: null,     // ISO string — auto-stamped on any data mutation
  lastExported: null,  // ISO string — stamped on full-data JSON export
  lastImported: null,  // ISO string — stamped on full-data JSON import
  syncFilePath: '',    // user memo — where they keep their sync file
}

function storageKey(ns) { return `certTracker_${ns}_settings` }

function load(ns) {
  try {
    const raw = localStorage.getItem(storageKey(ns))
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

function save(ns, data) {
  try { localStorage.setItem(storageKey(ns), JSON.stringify(data)) } catch {}
}

export function useSettings(namespace = 'default') {
  const [settings, setSettingsRaw] = useState(() => load(namespace))

  const setSettings = useCallback((updater) => {
    setSettingsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(namespace, next)
      return next
    })
  }, [namespace])

  const { darkMode, selectedCourses, workStart, workEnd, defaultTopicMins, maxSessionsPerDay, defaultBreakMins, subtopicsEnabled } = settings

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  const toggleDarkMode = useCallback(() => {
    setSettings((s) => ({ ...s, darkMode: !s.darkMode }))
  }, [setSettings])

  const toggleCourse = useCallback((id) => {
    setSettings((s) => {
      const sel = s.selectedCourses
      return {
        ...s,
        selectedCourses: sel.includes(id) ? sel.filter((c) => c !== id) : [...sel, id],
      }
    })
  }, [setSettings])

  const clearSelectedCourses = useCallback(() => {
    setSettings((s) => ({ ...s, selectedCourses: [] }))
  }, [setSettings])

  const setWorkStart = useCallback((value) => {
    setSettings((s) => ({ ...s, workStart: value }))
  }, [setSettings])

  const setWorkEnd = useCallback((value) => {
    setSettings((s) => ({ ...s, workEnd: value }))
  }, [setSettings])

  const setDefaultTopicMins = useCallback((value) => {
    setSettings((s) => ({ ...s, defaultTopicMins: value }))
  }, [setSettings])

  const setMaxSessionsPerDay = useCallback((n) => setSettings((s) => ({ ...s, maxSessionsPerDay: n })), [setSettings])

  const setDefaultBreakMins = useCallback((n) => setSettings((s) => ({ ...s, defaultBreakMins: Math.max(0, n) })), [setSettings])

  const setSubtopicsEnabled = useCallback((val) => setSettings((s) => ({ ...s, subtopicsEnabled: val })), [setSettings])

  // Sync timestamps
  const stampLastSaved    = useCallback(() => setSettings((s) => ({ ...s, lastSaved:    new Date().toISOString() })), [setSettings])
  const stampLastExported = useCallback(() => setSettings((s) => ({ ...s, lastExported: new Date().toISOString() })), [setSettings])
  const stampLastImported = useCallback(() => setSettings((s) => ({ ...s, lastImported: new Date().toISOString() })), [setSettings])
  const setSyncFilePath   = useCallback((path) => setSettings((s) => ({ ...s, syncFilePath: path })), [setSettings])

  return {
    darkMode,
    toggleDarkMode,
    selectedCourses,
    toggleCourse,
    clearSelectedCourses,
    workStart,
    workEnd,
    defaultTopicMins,
    maxSessionsPerDay,
    defaultBreakMins,
    setWorkStart,
    setWorkEnd,
    setDefaultTopicMins,
    setMaxSessionsPerDay,
    setDefaultBreakMins,
    subtopicsEnabled,
    setSubtopicsEnabled,
    // Sync
    lastSaved:    settings.lastSaved,
    lastExported: settings.lastExported,
    lastImported: settings.lastImported,
    syncFilePath: settings.syncFilePath,
    stampLastSaved,
    stampLastExported,
    stampLastImported,
    setSyncFilePath,
  }
}
