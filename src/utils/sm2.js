/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Ratings (quality):
 *   0 = Again  — complete blackout / couldn't recall
 *   3 = Hard   — recalled but with significant effort
 *   4 = Good   — recalled with minor hesitation
 *   5 = Easy   — perfect recall
 */

export const RATINGS = [
  { key: 'again', label: 'Again', quality: 0 },
  { key: 'hard',  label: 'Hard',  quality: 3 },
  { key: 'good',  label: 'Good',  quality: 4 },
  { key: 'easy',  label: 'Easy',  quality: 5 },
]

const EASE_MIN     = 1.3
const EASE_DEFAULT = 2.5
const MAX_INTERVAL = 365   // cap at 1 year — prevents runaway intervals

/**
 * Apply SM-2 to a card state and return the updated state.
 * @param {object|null} card  - existing { interval, repetitions, easeFactor }
 * @param {number}      quality - 0 | 3 | 4 | 5
 * @returns {object} updated SM-2 state
 */
export function applySm2(card, quality) {
  let interval    = card?.interval    ?? 0
  let repetitions = card?.repetitions ?? 0
  let easeFactor  = card?.easeFactor  ?? EASE_DEFAULT

  if (quality < 3) {
    // Failed — reset streak
    interval    = 1
    repetitions = 0
  } else {
    // Passed — advance
    if (repetitions === 0)      interval = 1
    else if (repetitions === 1) interval = 6
    else if (quality === 3) {
      // Hard: fixed 1.2x multiplier instead of easeFactor to prevent
      // runaway growth from repeated Hard presses on large intervals
      interval = Math.round(interval * 1.2)
    } else {
      interval = Math.round(interval * easeFactor)
    }

    repetitions += 1
    easeFactor = Math.max(
      EASE_MIN,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
    )

    // Hard cap — no card ever exceeds 1 year between reviews
    interval = Math.min(interval, MAX_INTERVAL)
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return {
    interval,
    repetitions,
    easeFactor:  Math.round(easeFactor * 1000) / 1000,
    nextReview:  nextReview.toISOString().split('T')[0],
    lastRated:   new Date().toISOString(),
    lastQuality: quality,
  }
}

/**
 * Project what interval would result if a card were rated at the given quality.
 * Used for tooltip previews without mutating state.
 */
export function projectedInterval(card, quality) {
  return applySm2(card, quality).interval
}

/**
 * Days until a card is due. Negative = overdue. 0 = today. -Infinity = never reviewed.
 */
export function daysUntilDue(card) {
  if (!card?.nextReview) return -Infinity
  const today = new Date().toISOString().split('T')[0]
  const diff  = new Date(card.nextReview) - new Date(today)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/** True if a card is due today or overdue. */
export function isDue(card) {
  return daysUntilDue(card) <= 0
}

/** Human-readable due label for display in the Study view. */
export function dueLabel(card) {
  if (!card?.nextReview) return 'New'
  const days = daysUntilDue(card)
  if (days === -Infinity) return 'New'
  if (days <  0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days <= 3) return 'Due'
  return `in ${days}d`
}
