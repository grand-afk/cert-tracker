import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { relativeTime } from '../../utils/relativeTime'

describe('relativeTime', () => {
  const NOW = new Date('2026-03-20T12:00:00.000Z').getTime()

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns "—" for null input', () => {
    expect(relativeTime(null)).toBe('—')
  })

  it('returns "—" for undefined input', () => {
    expect(relativeTime(undefined)).toBe('—')
  })

  it('returns "just now" for timestamp less than 60 seconds ago', () => {
    const ts = new Date(NOW - 30 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('just now')
  })

  it('returns "just now" for timestamp 59 seconds ago', () => {
    const ts = new Date(NOW - 59 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('just now')
  })

  it('returns minutes for 1–59 minutes ago', () => {
    const ts = new Date(NOW - 5 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('5m ago')
  })

  it('returns "1m ago" for exactly 60 seconds ago', () => {
    const ts = new Date(NOW - 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('1m ago')
  })

  it('returns hours for 1–23 hours ago', () => {
    const ts = new Date(NOW - 3 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('3h ago')
  })

  it('returns "1h ago" for exactly 60 minutes ago', () => {
    const ts = new Date(NOW - 60 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('1h ago')
  })

  it('returns days for 1–29 days ago', () => {
    const ts = new Date(NOW - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('7d ago')
  })

  it('returns "1d ago" for exactly 24 hours ago', () => {
    const ts = new Date(NOW - 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('1d ago')
  })

  it('returns months for 30+ days ago', () => {
    const ts = new Date(NOW - 45 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('1mo ago')
  })

  it('returns "2mo ago" for ~60 days ago', () => {
    const ts = new Date(NOW - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(ts)).toBe('2mo ago')
  })
})
