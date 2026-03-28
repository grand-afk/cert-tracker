import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRevisionTechniques, DEFAULT_TECHNIQUES } from '../../hooks/useRevisionTechniques'

describe('useRevisionTechniques', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── Initialisation ────────────────────────────────────────────────────────
  it('returns all default techniques on first load', () => {
    const { result } = renderHook(() => useRevisionTechniques())
    expect(result.current.techniques).toHaveLength(DEFAULT_TECHNIQUES.length)
  })

  it('all default techniques are active', () => {
    const { result } = renderHook(() => useRevisionTechniques())
    result.current.techniques.forEach((t) => {
      expect(t.active).toBe(true)
    })
  })

  it('activeTechniques matches techniques when all are active', () => {
    const { result } = renderHook(() => useRevisionTechniques())
    expect(result.current.activeTechniques).toHaveLength(DEFAULT_TECHNIQUES.length)
  })

  it('returns null lastImported on first load', () => {
    const { result } = renderHook(() => useRevisionTechniques())
    expect(result.current.lastImported).toBeNull()
  })

  // ── toggleActive ──────────────────────────────────────────────────────────
  describe('toggleActive', () => {
    it('deactivates an active technique', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.toggleActive('active-recall') })
      const t = result.current.techniques.find((x) => x.id === 'active-recall')
      expect(t.active).toBe(false)
    })

    it('activates a deactivated technique', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.toggleActive('active-recall') }) // → false
      act(() => { result.current.toggleActive('active-recall') }) // → true
      const t = result.current.techniques.find((x) => x.id === 'active-recall')
      expect(t.active).toBe(true)
    })

    it('removes deactivated technique from activeTechniques', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.toggleActive('blurting') })
      expect(result.current.activeTechniques.find((t) => t.id === 'blurting')).toBeUndefined()
    })

    it('persists toggle state to localStorage', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.toggleActive('feynman') })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_revisionTechniques'))
      const t = stored.find((x) => x.id === 'feynman')
      expect(t.active).toBe(false)
    })
  })

  // ── resetToDefaults ───────────────────────────────────────────────────────
  describe('resetToDefaults', () => {
    it('resets all techniques to defaults', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.toggleActive('active-recall') })
      act(() => { result.current.resetToDefaults() })
      const t = result.current.techniques.find((x) => x.id === 'active-recall')
      expect(t.active).toBe(true)
    })

    it('restores all 6 default techniques', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.resetToDefaults() })
      expect(result.current.techniques).toHaveLength(6)
    })
  })

  // ── importTechniques ──────────────────────────────────────────────────────
  describe('importTechniques', () => {
    it('imports a plain array of techniques', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      const custom = [{ id: 'custom-1', name: 'Custom', method: 'X', rationale: 'Y', active: true }]
      act(() => { result.current.importTechniques(JSON.stringify(custom)) })
      expect(result.current.techniques).toHaveLength(1)
      expect(result.current.techniques[0].id).toBe('custom-1')
    })

    it('imports from a bundle with _type cert-tracker-techniques', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      const bundle = {
        _type: 'cert-tracker-techniques',
        version: 1,
        exportedAt: new Date().toISOString(),
        techniques: DEFAULT_TECHNIQUES.slice(0, 3),
      }
      act(() => { result.current.importTechniques(JSON.stringify(bundle)) })
      expect(result.current.techniques).toHaveLength(3)
    })

    it('sets lastImported after a successful import', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      act(() => { result.current.importTechniques(JSON.stringify(DEFAULT_TECHNIQUES)) })
      expect(result.current.lastImported).toBeTruthy()
    })

    it('throws when given an invalid format', () => {
      const { result } = renderHook(() => useRevisionTechniques())
      expect(() => {
        act(() => { result.current.importTechniques(JSON.stringify({ not: 'an-array' })) })
      }).toThrow()
    })
  })

  // ── DEFAULT_TECHNIQUES content ────────────────────────────────────────────
  describe('DEFAULT_TECHNIQUES', () => {
    it('contains exactly 6 techniques', () => {
      expect(DEFAULT_TECHNIQUES).toHaveLength(6)
    })

    it('contains Active Recall', () => {
      expect(DEFAULT_TECHNIQUES.find((t) => t.id === 'active-recall')).toBeDefined()
    })

    it('contains Spaced Repetition', () => {
      expect(DEFAULT_TECHNIQUES.find((t) => t.id === 'spaced-repetition')).toBeDefined()
    })

    it('each technique has id, name, method, rationale, and active fields', () => {
      DEFAULT_TECHNIQUES.forEach((t) => {
        expect(t).toHaveProperty('id')
        expect(t).toHaveProperty('name')
        expect(t).toHaveProperty('method')
        expect(t).toHaveProperty('rationale')
        expect(t).toHaveProperty('active')
      })
    })
  })
})
