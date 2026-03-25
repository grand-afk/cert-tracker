import { useState, useCallback } from 'react'
import { applySm2 } from '../utils/sm2'

const STORAGE_KEY = 'certTracker_progress'
const STATUSES = ['not-started', 'in-progress', 'complete']

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

export function useProgress() {
  const [progress, setProgressRaw] = useState(load)

  const setProgress = useCallback((updater) => {
    setProgressRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [])

  const getStatus = useCallback((id) => progress[id]?.status ?? 'not-started', [progress])

  const cycleStatus = useCallback((id) => {
    setProgress((prev) => {
      const current = prev[id]?.status ?? 'not-started'
      const idx = STATUSES.indexOf(current)
      const next = STATUSES[(idx + 1) % STATUSES.length]
      return { ...prev, [id]: { ...(prev[id] || {}), status: next, lastUpdated: new Date().toISOString() } }
    })
  }, [setProgress])

  const setStatus = useCallback((id, status) => {
    setProgress((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), status, lastUpdated: new Date().toISOString() },
    }))
  }, [setProgress])

  const getLastUpdated = useCallback((id) => progress[id]?.lastUpdated ?? null, [progress])

  const computePercent = useCallback((ids) => {
    if (!ids.length) return 0
    const done = ids.filter((id) => (progress[id]?.status ?? 'not-started') === 'complete').length
    return Math.round((done / ids.length) * 100)
  }, [progress])

  // ── SM-2 ─────────────────────────────────────────────────────────────────
  const getSm2Card = useCallback((id) => progress[id]?.sm2 ?? null, [progress])

  const rateCard = useCallback((id, quality) => {
    setProgress((prev) => {
      const existing = prev[id]?.sm2 ?? null
      const updated = applySm2(existing, quality)
      // Auto-advance status based on rating
      const currentStatus = prev[id]?.status ?? 'not-started'
      const newStatus = quality >= 4 ? 'complete' : quality >= 3 ? 'in-progress' : currentStatus
      return {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          status: newStatus,
          lastUpdated: new Date().toISOString(),
          sm2: updated,
        },
      }
    })
  }, [setProgress])

  // ── Test score ────────────────────────────────────────────────────────────
  const getTestScore = useCallback((id) => {
    const p = progress[id]
    if (!p?.testScore && p?.testScore !== 0) return null
    return { score: p.testScore, date: p.testDate ?? null }
  }, [progress])

  const setTestScore = useCallback((id, score, date) => {
    setProgress((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), testScore: score, testDate: date, lastUpdated: new Date().toISOString() },
    }))
  }, [setProgress])

  // ── Per-topic duration overrides ───────────────────────────────────────────
  const getTopicMins = useCallback((id) => progress[id]?.topicMins ?? null, [progress])

  const setTopicMins = useCallback((id, mins) => {
    setProgress((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), topicMins: mins },
    }))
  }, [setProgress])

  // ── Restore (for undo/redo) ───────────────────────────────────────────────
  const restoreProgress = useCallback((data) => { setProgress(data) }, [setProgress])

  // ── Import / export / clear ───────────────────────────────────────────────
  const exportProgress = useCallback(() => progress, [progress])

  const importProgress = useCallback((data) => { setProgress(data) }, [setProgress])

  const clearAll = useCallback(() => { setProgress({}) }, [setProgress])

  const clearRating = useCallback((id) => {
    setProgress((prev) => {
      const entry = { ...(prev[id] || {}) }
      delete entry.sm2
      return { ...prev, [id]: entry }
    })
  }, [setProgress])

  return {
    progress,
    getStatus, cycleStatus, setStatus,
    getLastUpdated,
    computePercent,
    getSm2Card, rateCard, clearRating,
    getTestScore, setTestScore,
    getTopicMins, setTopicMins,
    exportProgress, importProgress, clearAll,
    restoreProgress,
  }
}
