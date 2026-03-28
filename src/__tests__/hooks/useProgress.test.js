import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProgress } from '../../hooks/useProgress'

describe('useProgress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty progress when localStorage is empty', () => {
    const { result } = renderHook(() => useProgress())
    expect(result.current.progress).toEqual({})
  })

  // ── getStatus ────────────────────────────────────────────────────────────────
  describe('getStatus', () => {
    it('returns "not-started" for unknown id', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.getStatus('unknown-id')).toBe('not-started')
    })

    it('returns stored status for a known id', () => {
      localStorage.setItem(
        'certTracker_default_progress',
        JSON.stringify({ 'gke-autopilot': { status: 'in-progress', lastUpdated: '2026-01-01T00:00:00.000Z' } })
      )
      const { result } = renderHook(() => useProgress())
      expect(result.current.getStatus('gke-autopilot')).toBe('in-progress')
    })
  })

  // ── cycleStatus ──────────────────────────────────────────────────────────────
  describe('cycleStatus', () => {
    it('cycles not-started → in-progress', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.cycleStatus('topic-1') })
      expect(result.current.getStatus('topic-1')).toBe('in-progress')
    })

    it('cycles in-progress → complete', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.cycleStatus('topic-1') }) // → in-progress
      act(() => { result.current.cycleStatus('topic-1') }) // → complete
      expect(result.current.getStatus('topic-1')).toBe('complete')
    })

    it('cycles complete → not-started (wraps around)', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.cycleStatus('topic-1') }) // → in-progress
      act(() => { result.current.cycleStatus('topic-1') }) // → complete
      act(() => { result.current.cycleStatus('topic-1') }) // → not-started
      expect(result.current.getStatus('topic-1')).toBe('not-started')
    })

    it('sets lastUpdated when cycling', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.cycleStatus('topic-1') })
      expect(result.current.getLastUpdated('topic-1')).toBeTruthy()
    })

    it('persists to localStorage after cycling', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.cycleStatus('topic-1') })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_progress'))
      expect(stored['topic-1'].status).toBe('in-progress')
    })
  })

  // ── setStatus ────────────────────────────────────────────────────────────────
  describe('setStatus', () => {
    it('sets status to a specific value directly', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('topic-2', 'complete') })
      expect(result.current.getStatus('topic-2')).toBe('complete')
    })

    it('updates lastUpdated when setting status', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('topic-2', 'in-progress') })
      expect(result.current.getLastUpdated('topic-2')).toBeTruthy()
    })
  })

  // ── getLastUpdated ───────────────────────────────────────────────────────────
  describe('getLastUpdated', () => {
    it('returns null for unknown id', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.getLastUpdated('no-such-id')).toBeNull()
    })

    it('returns ISO string after status is set', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('topic-3', 'complete') })
      const ts = result.current.getLastUpdated('topic-3')
      expect(() => new Date(ts)).not.toThrow()
      expect(new Date(ts).toISOString()).toBe(ts)
    })
  })

  // ── computePercent ───────────────────────────────────────────────────────────
  describe('computePercent', () => {
    it('returns 0 for empty id array', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.computePercent([])).toBe(0)
    })

    it('returns 0 when no topics are complete', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.computePercent(['a', 'b', 'c'])).toBe(0)
    })

    it('returns 100 when all topics are complete', () => {
      const { result } = renderHook(() => useProgress())
      act(() => {
        result.current.setStatus('a', 'complete')
        result.current.setStatus('b', 'complete')
      })
      expect(result.current.computePercent(['a', 'b'])).toBe(100)
    })

    it('returns 50 when half are complete', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('a', 'complete') })
      expect(result.current.computePercent(['a', 'b'])).toBe(50)
    })

    it('rounds to nearest integer', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('a', 'complete') })
      // 1/3 = 33.33...
      expect(result.current.computePercent(['a', 'b', 'c'])).toBe(33)
    })

    it('does not count in-progress as complete', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('a', 'in-progress') })
      expect(result.current.computePercent(['a', 'b'])).toBe(0)
    })
  })

  // ── exportProgress / importProgress ─────────────────────────────────────────
  describe('export and import', () => {
    it('exportProgress returns current progress object', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setStatus('x', 'complete') })
      const exported = result.current.exportProgress()
      expect(exported['x'].status).toBe('complete')
    })

    it('importProgress replaces progress with provided data', () => {
      const { result } = renderHook(() => useProgress())
      const data = { 'imported-topic': { status: 'in-progress', lastUpdated: '2026-01-01T00:00:00Z' } }
      act(() => { result.current.importProgress(data) })
      expect(result.current.getStatus('imported-topic')).toBe('in-progress')
    })
  })

  // ── clearAll ─────────────────────────────────────────────────────────────────
  describe('clearAll', () => {
    it('resets all progress to empty', () => {
      const { result } = renderHook(() => useProgress())
      act(() => {
        result.current.setStatus('a', 'complete')
        result.current.setStatus('b', 'in-progress')
      })
      act(() => { result.current.clearAll() })
      expect(result.current.progress).toEqual({})
      expect(result.current.getStatus('a')).toBe('not-started')
    })
  })

  // ── getSm2Card / rateCard ─────────────────────────────────────────────────
  describe('getSm2Card', () => {
    it('returns null for a topic that has never been rated', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.getSm2Card('unknown-topic')).toBeNull()
    })

    it('returns the sm2 card after a rating', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('topic-sm2', 4) })
      const card = result.current.getSm2Card('topic-sm2')
      expect(card).not.toBeNull()
      expect(card).toHaveProperty('interval')
      expect(card).toHaveProperty('repetitions')
      expect(card).toHaveProperty('easeFactor')
      expect(card).toHaveProperty('nextReview')
    })
  })

  describe('rateCard', () => {
    it('stores SM-2 card data after rating', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 5) })
      const card = result.current.getSm2Card('t1')
      expect(card.lastQuality).toBe(5)
    })

    it('advances status to "complete" on quality >= 4', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 4) })
      expect(result.current.getStatus('t1')).toBe('complete')
    })

    it('advances status to "complete" on quality 5 (Easy)', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 5) })
      expect(result.current.getStatus('t1')).toBe('complete')
    })

    it('advances status to "in-progress" on quality 3 (Hard)', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 3) })
      expect(result.current.getStatus('t1')).toBe('in-progress')
    })

    it('does not change status on quality 0 (Again) from not-started', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 0) })
      expect(result.current.getStatus('t1')).toBe('not-started')
    })

    it('sets lastUpdated after rating', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 4) })
      expect(result.current.getLastUpdated('t1')).toBeTruthy()
    })

    it('persists SM-2 data to localStorage', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.rateCard('t1', 4) })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_progress'))
      expect(stored['t1'].sm2).toBeDefined()
      expect(stored['t1'].sm2.repetitions).toBe(1)
    })
  })

  // ── getTestScore / setTestScore ───────────────────────────────────────────
  describe('getTestScore', () => {
    it('returns null when no test score has been set', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.getTestScore('topic-x')).toBeNull()
    })

    it('returns score and date after setting a test score', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setTestScore('topic-x', 85, '2026-03-01') })
      const info = result.current.getTestScore('topic-x')
      expect(info).not.toBeNull()
      expect(info.score).toBe(85)
      expect(info.date).toBe('2026-03-01')
    })

    it('returns { score: 0 } when score is 0 (zero is falsy but valid)', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setTestScore('topic-x', 0, '2026-03-01') })
      expect(result.current.getTestScore('topic-x')).not.toBeNull()
      expect(result.current.getTestScore('topic-x').score).toBe(0)
    })
  })

  describe('setTestScore', () => {
    it('persists test score to localStorage', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setTestScore('topic-y', 72, '2026-02-15') })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_progress'))
      expect(stored['topic-y'].testScore).toBe(72)
      expect(stored['topic-y'].testDate).toBe('2026-02-15')
    })

    it('overwrites previous test score', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setTestScore('topic-y', 60, '2026-01-01') })
      act(() => { result.current.setTestScore('topic-y', 90, '2026-03-01') })
      expect(result.current.getTestScore('topic-y').score).toBe(90)
    })

    it('sets lastUpdated when score is saved', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setTestScore('topic-z', 55, '2026-03-15') })
      expect(result.current.getLastUpdated('topic-z')).toBeTruthy()
    })
  })

  // ── getRevisionTechnique / setRevisionTechnique ───────────────────────────
  describe('getRevisionTechnique', () => {
    it('returns null for unknown topic and field', () => {
      const { result } = renderHook(() => useProgress())
      expect(result.current.getRevisionTechnique('no-topic', 'lastRevTechnique')).toBeNull()
    })

    it('returns the stored technique id after setRevisionTechnique', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setRevisionTechnique('t1', 'lastRevTechnique', 'active-recall') })
      expect(result.current.getRevisionTechnique('t1', 'lastRevTechnique')).toBe('active-recall')
    })

    it('returns null when technique is cleared (null passed)', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setRevisionTechnique('t1', 'lastRevTechnique', 'active-recall') })
      act(() => { result.current.setRevisionTechnique('t1', 'lastRevTechnique', null) })
      expect(result.current.getRevisionTechnique('t1', 'lastRevTechnique')).toBeNull()
    })

    it('stores lastRevTechnique and nextRevTechnique independently', () => {
      const { result } = renderHook(() => useProgress())
      act(() => {
        result.current.setRevisionTechnique('t1', 'lastRevTechnique', 'blurting')
        result.current.setRevisionTechnique('t1', 'nextRevTechnique', 'feynman')
      })
      expect(result.current.getRevisionTechnique('t1', 'lastRevTechnique')).toBe('blurting')
      expect(result.current.getRevisionTechnique('t1', 'nextRevTechnique')).toBe('feynman')
    })

    it('persists revision technique to localStorage', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setRevisionTechnique('t2', 'nextRevTechnique', 'dual-coding') })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_progress'))
      expect(stored['t2'].nextRevTechnique).toBe('dual-coding')
    })

    it('updates lastUpdated when technique is set', () => {
      const { result } = renderHook(() => useProgress())
      act(() => { result.current.setRevisionTechnique('t3', 'lastRevTechnique', 'interleaving') })
      expect(result.current.getLastUpdated('t3')).toBeTruthy()
    })
  })
})
