import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { applySm2, daysUntilDue, isDue, dueLabel, RATINGS } from '../../utils/sm2'

// ── RATINGS constant ─────────────────────────────────────────────────────────
describe('RATINGS', () => {
  it('exports four ratings', () => {
    expect(RATINGS).toHaveLength(4)
  })

  it('has again with quality 0', () => {
    const again = RATINGS.find((r) => r.key === 'again')
    expect(again).toBeDefined()
    expect(again.quality).toBe(0)
  })

  it('has hard with quality 3', () => {
    const hard = RATINGS.find((r) => r.key === 'hard')
    expect(hard.quality).toBe(3)
  })

  it('has good with quality 4', () => {
    const good = RATINGS.find((r) => r.key === 'good')
    expect(good.quality).toBe(4)
  })

  it('has easy with quality 5', () => {
    const easy = RATINGS.find((r) => r.key === 'easy')
    expect(easy.quality).toBe(5)
  })
})

// ── applySm2 ─────────────────────────────────────────────────────────────────
describe('applySm2', () => {
  it('handles null card (new card) with quality 5', () => {
    const result = applySm2(null, 5)
    expect(result).toHaveProperty('interval')
    expect(result).toHaveProperty('repetitions')
    expect(result).toHaveProperty('easeFactor')
    expect(result).toHaveProperty('nextReview')
    expect(result).toHaveProperty('lastRated')
    expect(result).toHaveProperty('lastQuality', 5)
  })

  it('sets interval=1 on first correct repetition', () => {
    const result = applySm2(null, 4)
    expect(result.interval).toBe(1)
    expect(result.repetitions).toBe(1)
  })

  it('sets interval=6 on second correct repetition', () => {
    const first = applySm2(null, 4)   // rep 0 → 1, interval 1
    const second = applySm2(first, 4) // rep 1 → 2, interval 6
    expect(second.interval).toBe(6)
    expect(second.repetitions).toBe(2)
  })

  it('uses easeFactor multiplication after two correct reps', () => {
    const first  = applySm2(null, 4)
    const second = applySm2(first, 4)
    const third  = applySm2(second, 4)
    expect(third.interval).toBe(Math.round(6 * second.easeFactor))
    expect(third.repetitions).toBe(3)
  })

  it('resets interval and repetitions on quality < 3 (Again)', () => {
    const first = applySm2(null, 5)
    const failed = applySm2(first, 0)
    expect(failed.interval).toBe(1)
    expect(failed.repetitions).toBe(0)
  })

  it('does not reset on quality === 3 (Hard)', () => {
    const first = applySm2(null, 4) // rep=1
    const hard  = applySm2(first, 3)
    expect(hard.repetitions).toBe(2)
    expect(hard.interval).toBeGreaterThanOrEqual(1)
  })

  it('easeFactor increases on quality 5 (Easy)', () => {
    const before = { interval: 6, repetitions: 2, easeFactor: 2.5 }
    const result = applySm2(before, 5)
    expect(result.easeFactor).toBeGreaterThan(2.5)
  })

  it('easeFactor decreases on quality 3 (Hard)', () => {
    const before = { interval: 6, repetitions: 2, easeFactor: 2.5 }
    const result = applySm2(before, 3)
    expect(result.easeFactor).toBeLessThan(2.5)
  })

  it('easeFactor never falls below 1.3', () => {
    let card = null
    // Repeatedly rate as Again/Hard
    for (let i = 0; i < 20; i++) {
      card = applySm2(card, 0)
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('nextReview is a valid YYYY-MM-DD date string', () => {
    const result = applySm2(null, 4)
    expect(result.nextReview).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('nextReview is today+1 for first correct review', () => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const expectedDate = tomorrow.toISOString().split('T')[0]
    const result = applySm2(null, 4)
    expect(result.nextReview).toBe(expectedDate)
  })

  it('lastQuality stores the provided quality value', () => {
    expect(applySm2(null, 3).lastQuality).toBe(3)
    expect(applySm2(null, 5).lastQuality).toBe(5)
  })

  it('stores lastRated as ISO date string', () => {
    const result = applySm2(null, 4)
    expect(() => new Date(result.lastRated)).not.toThrow()
    expect(new Date(result.lastRated).toISOString()).toBe(result.lastRated)
  })
})

// ── daysUntilDue ─────────────────────────────────────────────────────────────
describe('daysUntilDue', () => {
  it('returns -Infinity for null card', () => {
    expect(daysUntilDue(null)).toBe(-Infinity)
  })

  it('returns -Infinity when card has no nextReview', () => {
    expect(daysUntilDue({})).toBe(-Infinity)
  })

  it('returns 0 when nextReview is today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(daysUntilDue({ nextReview: today })).toBe(0)
  })

  it('returns positive days when nextReview is in the future', () => {
    const future = new Date()
    future.setDate(future.getDate() + 5)
    const nextReview = future.toISOString().split('T')[0]
    expect(daysUntilDue({ nextReview })).toBe(5)
  })

  it('returns negative days when nextReview is in the past', () => {
    const past = new Date()
    past.setDate(past.getDate() - 3)
    const nextReview = past.toISOString().split('T')[0]
    expect(daysUntilDue({ nextReview })).toBe(-3)
  })
})

// ── isDue ─────────────────────────────────────────────────────────────────────
describe('isDue', () => {
  it('returns true for null card (never reviewed)', () => {
    expect(isDue(null)).toBe(true)
  })

  it('returns true when card is due today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(isDue({ nextReview: today })).toBe(true)
  })

  it('returns true when card is overdue', () => {
    const past = new Date()
    past.setDate(past.getDate() - 2)
    expect(isDue({ nextReview: past.toISOString().split('T')[0] })).toBe(true)
  })

  it('returns false when card is due in the future', () => {
    const future = new Date()
    future.setDate(future.getDate() + 1)
    expect(isDue({ nextReview: future.toISOString().split('T')[0] })).toBe(false)
  })
})

// ── dueLabel ─────────────────────────────────────────────────────────────────
describe('dueLabel', () => {
  it('returns "New" for null card', () => {
    expect(dueLabel(null)).toBe('New')
  })

  it('returns "New" for card with no nextReview', () => {
    expect(dueLabel({})).toBe('New')
  })

  it('returns "Due today" when nextReview is today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(dueLabel({ nextReview: today })).toBe('Due today')
  })

  it('returns "Xd overdue" for past dates', () => {
    const past = new Date()
    past.setDate(past.getDate() - 4)
    expect(dueLabel({ nextReview: past.toISOString().split('T')[0] })).toBe('4d overdue')
  })

  it('returns "Due" for dates within 3 days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 2)
    expect(dueLabel({ nextReview: soon.toISOString().split('T')[0] })).toBe('Due')
  })

  it('returns "in Xd" for future dates beyond 3 days', () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    expect(dueLabel({ nextReview: future.toISOString().split('T')[0] })).toBe('in 7d')
  })
})
