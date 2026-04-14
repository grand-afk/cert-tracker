import { useState, useEffect, useRef } from 'react'

function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 0) {
    const fd = Math.abs(d)
    if (fd === 1) return 'Tomorrow'
    return `In ${fd} days`
  }
  return `${d} days ago`
}

export default function SubtopicDrawer({
  subtopicId,
  item,
  context,
  getStatus,
  getSm2Card,
  rateCard,
  getTestScore,
  onSave,
  onClose,
  slotContext = null,
  onSlotSave = null,
}) {
  const [visible, setVisible] = useState(false)

  // Form state
  const [name, setName]             = useState('')
  const [editingName, setEditingName] = useState(false)
  const [status, setStatus]         = useState('not-started')
  const [dueDate, setDueDate]       = useState('')
  const [dueTime, setDueTime]       = useState('')
  const [resources, setResources]   = useState({ courseContent: '', video: '', anki: '', testLink: '' })
  const [notes, setNotes]           = useState('')
  const [testScore, setTestScore]   = useState('')
  const [studyOpen, setStudyOpen]   = useState(true)
  const [currentQuality, setCurrentQuality] = useState(null)
  const [slotStart, setSlotStart]   = useState(slotContext?.startTime ?? '')
  const [slotDuration, setSlotDuration] = useState(slotContext?.durationMins ?? 60)

  const nameInputRef = useRef(null)

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Reset form ONLY when subtopicId changes
  useEffect(() => {
    if (!item) return
    setName(item.name ?? '')
    setEditingName(false)
    setStatus(getStatus(subtopicId))
    setDueDate(item.dueDate ?? item.topicDueDate ?? '')
    setDueTime(item.dueTime ?? item.topicDueTime ?? '')
    setResources({ courseContent: '', video: '', anki: '', testLink: '', ...item.resources })
    setNotes(item.notes ?? '')
    const ts = getTestScore(subtopicId)
    setTestScore(ts ? String(ts.score) : '')
    setStudyOpen(true)
    setCurrentQuality(getSm2Card(subtopicId)?.lastQuality ?? null)
    setSlotStart(slotContext?.startTime ?? '')
    setSlotDuration(slotContext?.durationMins ?? 60)
  }, [subtopicId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key closes drawer
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus name input when editing name
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  function commitName() {
    setEditingName(false)
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') commitName()
    if (e.key === 'Escape') { setName(item.name ?? ''); setEditingName(false) }
  }

  function handleSave() {
    const ts = getTestScore(subtopicId)
    const scoreNum = testScore !== '' ? Number(testScore) : null
    onSave(subtopicId, {
      name,
      status,
      dueDate,
      dueTime,
      resources,
      notes,
      testScore: scoreNum !== null && !isNaN(scoreNum) ? scoreNum : ts?.score ?? null,
      testDate: ts?.date ?? new Date().toISOString().slice(0, 10),
    })
    if (slotContext && onSlotSave) {
      onSlotSave({ startTime: slotStart, durationMins: slotDuration })
    }
  }

  function handleRateCard(id, q) {
    rateCard(id, q)
    setCurrentQuality(q)
  }

  const card = getSm2Card(subtopicId)

  const QUALITY_LABELS = [
    { q: 0, label: 'Again',  color: '#EA4335' },
    { q: 3, label: 'Hard',   color: '#FBBC05' },
    { q: 4, label: 'Good',   color: '#34A853' },
    { q: 5, label: 'Easy',   color: '#4285F4' },
  ]

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className={`drawer ${visible ? 'drawer--open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-breadcrumb">
            <span
              className="drawer-breadcrumb__dot"
              style={{ background: item.courseColor }}
            />
            <span>{item.courseName}</span>
            {item.topicName && (
              <>
                <span className="drawer-breadcrumb__sep">›</span>
                <span>{item.topicName}</span>
              </>
            )}
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            title="Close"
            style={{ flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Slot schedule section — shown when opened from a calendar slot */}
          {slotContext && (
            <div className="drawer-slot-section">
              <div className="drawer-section-label">Scheduled Session</div>
              <div className="drawer-2col">
                <div className="drawer-field">
                  <label>Start Time</label>
                  <input type="time" className="form-input"
                    value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
                </div>
                <div className="drawer-field">
                  <label>Duration (mins)</label>
                  <input type="number" min={15} max={480} step={15} className="form-input"
                    value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            {editingName ? (
              <input
                ref={nameInputRef}
                className="form-input drawer-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={handleNameKeyDown}
              />
            ) : (
              <h2
                className="drawer-name-heading"
                onClick={() => setEditingName(true)}
                title="Click to edit name"
              >
                {name}
              </h2>
            )}
          </div>

          {/* 2-column row: Status | Due date/time */}
          <div className="drawer-2col">
            <div className="drawer-field">
              <label>Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            <div className="drawer-field">
              <label>Due</label>
              <div className="drawer-due-row">
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <input
                  type="time"
                  className="form-input"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Study accordion */}
          <div>
            <button
              className="drawer-accordion-btn"
              onClick={() => setStudyOpen((o) => !o)}
            >
              {studyOpen ? '▼' : '▶'} STUDY
            </button>
            {studyOpen && (
              <div className="drawer-accordion-content">
                {/* Test score */}
                <div className="drawer-score-row">
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                    Test Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-input"
                    value={testScore}
                    onChange={(e) => setTestScore(e.target.value)}
                    placeholder="0–100"
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                </div>

                {/* SM-2 read-only info */}
                <div className="drawer-sm2-grid">
                  <div className="drawer-sm2-cell">
                    <span className="drawer-sm2-label">Last Review</span>
                    <span className="drawer-sm2-value">{relTime(card?.lastRated)}</span>
                  </div>
                  <div className="drawer-sm2-cell">
                    <span className="drawer-sm2-label">Next Review</span>
                    <span className="drawer-sm2-value">{relTime(card?.nextReview)}</span>
                  </div>
                  <div className="drawer-sm2-cell">
                    <span className="drawer-sm2-label">Interval</span>
                    <span className="drawer-sm2-value">
                      {card ? `${card.interval ?? 1}d` : '—'}
                    </span>
                  </div>
                  <div className="drawer-sm2-cell">
                    <span className="drawer-sm2-label">Ease</span>
                    <span className="drawer-sm2-value">
                      {card ? (card.easeFactor ?? 2.5).toFixed(1) : '—'}
                    </span>
                  </div>
                </div>

                {/* Rating buttons */}
                <div>
                  <div className="drawer-section-label" style={{ marginBottom: 6 }}>Rate</div>
                  <div className="drawer-rate-row">
                    {QUALITY_LABELS.map(({ q, label, color }) => (
                      <button
                        key={q}
                        className={`btn btn-sm drawer-rate-btn${currentQuality === q ? ' drawer-rate-btn--active' : ''}`}
                        style={currentQuality === q ? { background: color, borderColor: color, color: '#fff' } : {}}
                        onClick={() => handleRateCard(subtopicId, q)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resources */}
          <div>
            <div className="drawer-section-label">Resources</div>
            <div className="drawer-resources">
              {[
                { key: 'courseContent', label: 'Course Content' },
                { key: 'video',         label: 'Video' },
                { key: 'anki',          label: 'Anki' },
                { key: 'testLink',      label: 'Test Link' },
              ].map(({ key, label }) => (
                <div key={key} className="drawer-field">
                  <label>{label}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`https://…`}
                    value={resources[key] ?? ''}
                    onChange={(e) =>
                      setResources((r) => ({ ...r, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="drawer-field">
            <label className="drawer-section-label">Notes</label>
            <textarea
              className="form-input"
              placeholder="Add study notes…"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>
    </>
  )
}
