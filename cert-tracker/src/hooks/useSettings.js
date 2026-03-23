import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'certTracker_settings'

const DEFAULTS = {
  darkMode: true,
  selectedCourses: [],  // empty = show all
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export function useSettings() {
  const [settings, setSettingsRaw] = useState(load)

  const setSettings = useCallback((updater) => {
    setSettingsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [])

  const { darkMode, selectedCourses } = settings

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

  return {
    darkMode,
    toggleDarkMode,
    selectedCourses,
    toggleCourse,
    clearSelectedCourses,
  }
}
