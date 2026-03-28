import { useState, useCallback } from 'react'

function storageKey(ns) { return `certTracker_${ns}_revisionTechniques` }
function lastImportedKey(ns) { return `certTracker_${ns}_revTechLastImported` }

export const DEFAULT_TECHNIQUES = [
  {
    id: 'active-recall',
    name: 'Active Recall',
    method: 'Instead of reading notes, close the book and write down everything you remember or answer practice questions from scratch.',
    rationale: 'Forces the brain to retrieve info, strengthening neural pathways. It identifies exactly what you don\'t know.',
    active: true,
  },
  {
    id: 'spaced-repetition',
    name: 'Spaced Repetition',
    method: 'Reviewing the same material at increasing intervals (e.g., 1 day, 3 days, 1 week, 1 month later).',
    rationale: 'Combats the "Forgetting Curve." It moves information from short-term to long-term memory.',
    active: true,
  },
  {
    id: 'blurting',
    name: 'Blurting',
    method: 'Read a topic for 10 minutes, close the book, and "blurt" everything you remember onto a blank sheet of paper in a different color.',
    rationale: 'A high-intensity form of active recall that highlights gaps in knowledge immediately.',
    active: true,
  },
  {
    id: 'dual-coding',
    name: 'Dual Coding',
    method: 'Combining words with visuals (diagrams, timelines, or icons).',
    rationale: 'Humans process verbal and visual info through different channels. Using both provides two ways to "find" the memory later.',
    active: true,
  },
  {
    id: 'feynman',
    name: 'The Feynman Technique',
    method: 'Explain a complex concept out loud as if you were teaching it to a 10-year-old.',
    rationale: 'If you can\'t explain it simply, you don\'t understand it. It forces you to strip away jargon and find the core logic.',
    active: true,
  },
  {
    id: 'interleaving',
    name: 'Interleaving',
    method: 'Mixing up different subjects or topics in one study session (e.g., 30 mins Algebra, 30 mins Biology) rather than "blocking" one subject all day.',
    rationale: 'Forces the brain to distinguish between different types of problems, which is exactly what happens in exams.',
    active: true,
  },
]

function load(ns) {
  try {
    const raw = localStorage.getItem(storageKey(ns))
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function persist(ns, data) {
  try { localStorage.setItem(storageKey(ns), JSON.stringify(data)) } catch {}
}

export function useRevisionTechniques(namespace = 'default') {
  const [techniques, setTechniquesRaw] = useState(() => load(namespace) || DEFAULT_TECHNIQUES)
  const [lastImported, setLastImported] = useState(() => {
    try { return localStorage.getItem(lastImportedKey(namespace)) || null } catch { return null }
  })

  const setTechniques = useCallback((data) => {
    setTechniquesRaw(data)
    persist(namespace, data)
  }, [namespace])

  const toggleActive = useCallback((id) => {
    setTechniquesRaw((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, active: !t.active } : t)
      persist(namespace, next)
      return next
    })
  }, [namespace])

  const exportTechniques = useCallback(() => {
    const bundle = { _type: 'cert-tracker-techniques', version: 1, exportedAt: new Date().toISOString(), techniques }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revision-techniques-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [techniques])

  const importTechniques = useCallback((jsonString) => {
    const raw = JSON.parse(jsonString)
    const data = raw._type === 'cert-tracker-techniques' ? raw.techniques : raw
    if (!Array.isArray(data)) throw new Error('Invalid techniques format')
    setTechniques(data)
    const ts = new Date().toISOString()
    setLastImported(ts)
    try { localStorage.setItem(lastImportedKey(namespace), ts) } catch {}
  }, [namespace, setTechniques])

  const resetToDefaults = useCallback(() => {
    setTechniques(DEFAULT_TECHNIQUES)
  }, [setTechniques])

  const activeTechniques = techniques.filter((t) => t.active)

  return {
    techniques,
    activeTechniques,
    toggleActive,
    exportTechniques,
    importTechniques,
    resetToDefaults,
    lastImported,
  }
}
