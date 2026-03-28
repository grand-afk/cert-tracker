import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from '../../hooks/useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset the html class between tests
    document.documentElement.className = ''
  })

  it('returns default values when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.darkMode).toBe(true)
    expect(result.current.selectedCourses).toEqual([])
  })

  it('loads persisted settings from localStorage', () => {
    localStorage.setItem(
      'certTracker_default_settings',
      JSON.stringify({ darkMode: false, selectedCourses: ['gke', 'iam'] })
    )
    const { result } = renderHook(() => useSettings())
    expect(result.current.darkMode).toBe(false)
    expect(result.current.selectedCourses).toEqual(['gke', 'iam'])
  })

  // ── toggleDarkMode ────────────────────────────────────────────────────────
  describe('toggleDarkMode', () => {
    it('toggles darkMode from true to false', () => {
      const { result } = renderHook(() => useSettings())
      expect(result.current.darkMode).toBe(true)
      act(() => { result.current.toggleDarkMode() })
      expect(result.current.darkMode).toBe(false)
    })

    it('toggles darkMode from false to true', () => {
      localStorage.setItem('certTracker_default_settings', JSON.stringify({ darkMode: false, selectedCourses: [] }))
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleDarkMode() })
      expect(result.current.darkMode).toBe(true)
    })

    it('applies "light" class to html element when darkMode is false', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleDarkMode() }) // → false
      expect(document.documentElement.classList.contains('light')).toBe(true)
    })

    it('removes "light" class from html element when darkMode is true', () => {
      document.documentElement.classList.add('light')
      const { result } = renderHook(() => useSettings())
      // darkMode starts true → should remove light class
      expect(document.documentElement.classList.contains('light')).toBe(false)
    })

    it('persists darkMode to localStorage', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleDarkMode() })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_settings'))
      expect(stored.darkMode).toBe(false)
    })
  })

  // ── toggleCourse ──────────────────────────────────────────────────────────
  describe('toggleCourse', () => {
    it('adds a course id to selectedCourses', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleCourse('gke') })
      expect(result.current.selectedCourses).toContain('gke')
    })

    it('removes a course id that is already selected', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleCourse('gke') })
      act(() => { result.current.toggleCourse('gke') })
      expect(result.current.selectedCourses).not.toContain('gke')
    })

    it('can select multiple courses independently', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleCourse('gke') })
      act(() => { result.current.toggleCourse('iam') })
      expect(result.current.selectedCourses).toEqual(['gke', 'iam'])
    })

    it('persists selectedCourses to localStorage', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.toggleCourse('networking') })
      const stored = JSON.parse(localStorage.getItem('certTracker_default_settings'))
      expect(stored.selectedCourses).toContain('networking')
    })
  })

  // ── clearSelectedCourses ──────────────────────────────────────────────────
  describe('clearSelectedCourses', () => {
    it('empties the selectedCourses array', () => {
      const { result } = renderHook(() => useSettings())
      act(() => {
        result.current.toggleCourse('gke')
        result.current.toggleCourse('iam')
      })
      act(() => { result.current.clearSelectedCourses() })
      expect(result.current.selectedCourses).toEqual([])
    })
  })

  // ── sync metadata ─────────────────────────────────────────────────────────
  describe('sync metadata', () => {
    it('lastSaved defaults to null', () => {
      const { result } = renderHook(() => useSettings())
      expect(result.current.lastSaved).toBeNull()
    })

    it('stampLastSaved sets lastSaved to an ISO string', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.stampLastSaved() })
      expect(typeof result.current.lastSaved).toBe('string')
      expect(() => new Date(result.current.lastSaved)).not.toThrow()
    })

    it('stampLastExported sets lastExported', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.stampLastExported() })
      expect(result.current.lastExported).toBeTruthy()
    })

    it('stampLastImported sets lastImported', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.stampLastImported() })
      expect(result.current.lastImported).toBeTruthy()
    })

    it('setSyncFilePath stores the path', () => {
      const { result } = renderHook(() => useSettings())
      act(() => { result.current.setSyncFilePath('G:\\My Drive\\backup.json') })
      expect(result.current.syncFilePath).toBe('G:\\My Drive\\backup.json')
    })
  })
})
