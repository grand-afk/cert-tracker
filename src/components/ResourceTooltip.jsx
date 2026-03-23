import { useState, useRef, useEffect } from 'react'

const RESOURCES = [
  { key: 'courseContent', icon: '📚', label: 'Course Content' },
  { key: 'video',         icon: '🎬', label: 'Video' },
  { key: 'anki',          icon: '🃏', label: 'Anki Deck' },
  { key: 'testLink',      icon: '🧪', label: 'Practice Test' },
]

export default function ResourceTooltip({ resources = {}, topicName, onEdit }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const hasAnyLink = RESOURCES.some((r) => resources[r.key]?.trim())

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="resource-tooltip-wrap" ref={wrapRef}>
      <button
        className={`resource-btn ${hasAnyLink ? 'resource-btn--has-links' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Resources"
        aria-label="Resources"
      >
        {RESOURCES.map(({ key, icon, label }) => (
          <span
            key={key}
            className={`resource-pip ${resources[key]?.trim() ? 'resource-pip--set' : 'resource-pip--empty'}`}
            title={`${label}: ${resources[key]?.trim() ? 'set' : 'not set'}`}
          >
            {icon}
          </span>
        ))}
      </button>

      {open && (
        <div className="resource-tooltip" role="tooltip">
          {topicName && (
            <div className="resource-tooltip-title">{topicName}</div>
          )}
          {RESOURCES.map(({ key, icon, label }) => {
            const url = resources[key]
            if (url) {
              return (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                   className="resource-link" onClick={() => setOpen(false)}>
                  <span className="resource-link__icon">{icon}</span>
                  <span className="resource-link__label">{label}</span>
                  <span className="resource-link__ext">↗</span>
                </a>
              )
            }
            return (
              <span key={key} className="resource-link resource-link--empty">
                <span className="resource-link__icon">{icon}</span>
                <span className="resource-link__label">{label} — not set</span>
              </span>
            )
          })}
          {onEdit && (
            <button
              className="resource-edit-btn"
              onClick={() => { setOpen(false); onEdit() }}
            >
              ✏️ Edit links
            </button>
          )}
        </div>
      )}
    </div>
  )
}
