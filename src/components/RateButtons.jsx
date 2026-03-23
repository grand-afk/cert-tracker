import { RATINGS, projectedInterval } from '../utils/sm2'

const DESCS = {
  0: 'Forgot — resets to',
  3: 'Hard — due in',
  4: 'Got it — due in',
  5: 'Easy — due in',
}

/**
 * Again / Hard / Good / Easy rating buttons (SM-2).
 *
 * Props:
 *   onRate      — called with quality (0|3|4|5) when a button is clicked
 *   card        — current SM-2 card state; used to compute projected due dates for tooltips
 *   lastQuality — quality of the last rating given; highlights that button
 *   disabled    — disables all buttons
 *   compact     — smaller gap between buttons
 */
export default function RateButtons({ onRate, card = null, lastQuality = null, disabled = false, compact = false }) {
  function buildTitle(quality) {
    const days = projectedInterval(card, quality)
    if (quality === 0) return `${DESCS[0]} tomorrow`
    return `${DESCS[quality]} ${days}d`
  }

  return (
    <div className={`rate-buttons ${compact ? 'rate-buttons--compact' : ''}`}>
      {RATINGS.map(({ key, label, quality }) => (
        <button
          key={key}
          className={`rate-btn rate-btn--${key} ${lastQuality === quality ? 'rate-btn--current' : ''}`}
          onClick={() => onRate(quality)}
          disabled={disabled}
          title={buildTitle(quality)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
