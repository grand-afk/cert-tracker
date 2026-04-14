export default function DonutChart({ slices, size = 180, strokeWidth = 44, activeKey, onSliceClick }) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const total = slices.reduce((s, sl) => s + sl.value, 0)

  if (total === 0) return (
    <div className="donut-chart-wrap">
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fill="var(--text-muted)">No data</text>
      </svg>
    </div>
  )

  let offset = 0
  return (
    <div className="donut-chart-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {slices.map((sl) => {
          const ratio = sl.value / total
          const dash = ratio * circumference
          const gap = circumference - dash
          const sliceOffset = offset
          offset += dash
          const isActive = sl.key === activeKey
          const sw = isActive ? strokeWidth + 8 : strokeWidth
          return (
            <circle
              key={sl.key}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={sl.color}
              strokeWidth={sw}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-sliceOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
              onClick={() => onSliceClick(isActive ? null : sl.key)}
            />
          )
        })}
        {/* Centre label */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--text-muted)">topics</text>
      </svg>

      <div className="chart-legend">
        {slices.map((sl) => (
          <div
            key={sl.key}
            className={`chart-legend-item${sl.key === activeKey ? ' chart-legend-item--active' : ''}`}
            onClick={() => onSliceClick(sl.key === activeKey ? null : sl.key)}
          >
            <span className="chart-legend-swatch" style={{ background: sl.color }} />
            <span>{sl.label} ({sl.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
