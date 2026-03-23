import { RATINGS } from '../utils/sm2'

/**
 * Again / Hard / Good / Easy rating buttons (SM-2).
 */
export default function RateButtons({ onRate, disabled = false, compact = false }) {
  return (
    <div className={`rate-buttons ${compact ? 'rate-buttons--compact' : ''}`}>
      {RATINGS.map(({ key, label, quality }) => (
        <button
          key={key}
          className={`rate-btn rate-btn--${key}`}
          onClick={() => onRate(quality)}
          disabled={disabled}
          title={label}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
