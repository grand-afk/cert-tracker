import { useState, useRef } from 'react'

// ── DriveSyncSection ───────────────────────────────────────────────────────────
function relTime(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function DriveSyncSection({ driveSync }) {
  const {
    clientId, setClientId,
    authState, connect, disconnect,
    driveFileId, syncing, lastSync, syncError,
    saveToDrive, loadFromDrive, isReady,
    sharedFileId, setSharedFileId,
    loadingShared, sharedError, loadFromSharedFile,
  } = driveSync

  const [showClientId, setShowClientId] = useState(false)
  const [clientIdDraft, setClientIdDraft] = useState(clientId || '')
  const [sharedIdDraft, setSharedIdDraft] = useState(sharedFileId || '')
  const [copied, setCopied] = useState(false)

  function copyFileId() {
    navigator.clipboard.writeText(driveFileId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const statusLabel = {
    idle:     { text: 'Not configured', color: 'var(--text-muted)' },
    loading:  { text: 'Loading…',       color: 'var(--text-muted)' },
    unauthed: { text: 'Not connected',  color: '#FB8C00' },
    authed:   { text: 'Connected',      color: '#43A047' },
    error:    { text: 'Error',          color: '#EA4335' },
  }[authState] || { text: authState, color: 'var(--text-muted)' }

  return (
    <div className="settings-section">
      <div className="settings-section-title">Google Drive Sync</div>

      {/* Client ID config */}
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <div className="settings-label">Status</div>
            <div className="settings-hint" style={{ color: statusLabel.color, fontWeight: 500 }}>{statusLabel.text}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {authState === 'authed' ? (
              <button className="btn btn-secondary btn-sm" onClick={disconnect}>Disconnect</button>
            ) : authState === 'unauthed' ? (
              <button className="btn btn-primary btn-sm" onClick={connect}>Connect to Drive</button>
            ) : null}
            <button className="btn btn-secondary btn-sm" onClick={() => setShowClientId(v => !v)}>
              {showClientId ? 'Hide' : 'Configure'}
            </button>
          </div>
        </div>

        {showClientId && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="settings-hint">
              Enter your Google Cloud OAuth 2.0 Client ID. Create one at{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
                 style={{ color: 'var(--accent)' }}>console.cloud.google.com</a> — enable the Drive API,
              create an OAuth Web client, and add <code style={{ fontSize: 11 }}>https://grand-afk.github.io</code> as
              an Authorized JavaScript origin.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" style={{ flex: 1, fontSize: 12 }}
                     placeholder="xxxxxxxx.apps.googleusercontent.com"
                     value={clientIdDraft}
                     onChange={e => setClientIdDraft(e.target.value)} />
              <button className="btn btn-primary btn-sm"
                      onClick={() => { setClientId(clientIdDraft.trim()); setShowClientId(false) }}
                      disabled={!clientIdDraft.trim()}>Save</button>
            </div>
          </div>
        )}
      </div>

      {/* Save / Load */}
      {(authState === 'authed' || authState === 'unauthed') && (
        <div className="settings-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="settings-label">Sync this cert</div>
            <div className="settings-hint">
              {driveFileId
                ? `Linked to Drive file · last synced ${relTime(lastSync) || 'never'}`
                : 'Not yet synced — click Save to create the Drive file'}
            </div>
            {syncError && (
              <div className="settings-hint" style={{ color: '#EA4335', marginTop: 4 }}>{syncError}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm"
                    onClick={loadFromDrive}
                    disabled={!isReady || syncing || !driveFileId}
                    title="Pull latest data from Drive">
              {syncing ? '…' : '⬇ Load'}
            </button>
            <button className="btn btn-primary btn-sm"
                    onClick={saveToDrive}
                    disabled={!isReady || syncing}
                    title="Push current data to Drive">
              {syncing ? '…' : '⬆ Save'}
            </button>
          </div>
        </div>
      )}

      {/* Share your file ID */}
      {isReady && driveFileId && (
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <div className="settings-label">Share with others</div>
          <div className="settings-hint" style={{ marginBottom: 2 }}>
            Copy your file ID and share it. Others can paste it below to load your cert data.
          </div>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <input className="form-input" style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', cursor: 'text' }}
                   readOnly value={driveFileId} />
            <button className="btn btn-secondary btn-sm" onClick={copyFileId} style={{ flexShrink: 0 }}>
              {copied ? '✓ Copied' : 'Copy ID'}
            </button>
          </div>
        </div>
      )}

      {/* Load from shared file */}
      {(authState === 'authed' || authState === 'unauthed') && (
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <div className="settings-label">Load from shared file</div>
          <div className="settings-hint" style={{ marginBottom: 2 }}>
            Paste a file ID shared by someone else to pull their cert data.
            Requires a one-time <em>View Drive files</em> permission.
          </div>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <input className="form-input" style={{ flex: 1, fontSize: 12 }}
                   placeholder="Paste file ID or Drive URL…"
                   value={sharedIdDraft}
                   onChange={e => {
                     const val = e.target.value
                     // Auto-extract ID from Drive URLs like /d/FILE_ID/view
                     const match = val.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
                     setSharedIdDraft(match ? match[1] : val)
                   }} />
            <button className="btn btn-primary btn-sm"
                    style={{ flexShrink: 0 }}
                    disabled={!sharedIdDraft.trim() || loadingShared}
                    onClick={() => { setSharedFileId(sharedIdDraft.trim()); loadFromSharedFile(sharedIdDraft.trim()) }}>
              {loadingShared ? '…' : '⬇ Load'}
            </button>
          </div>
          {sharedError && (
            <div className="settings-hint" style={{ color: '#EA4335' }}>{sharedError}</div>
          )}
        </div>
      )}

      <div className="settings-hint" style={{ padding: '0 16px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
        Saves certData + progress + calendar as a single JSON file in your Drive.
        Use Load on another device to restore. Only files created by this app are accessible.
      </div>
    </div>
  )
}

// ── StepInput — mobile-friendly stepper for numeric settings ──────────────────
function StepInput({ value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <div className="step-input">
      <button className="step-input__btn" type="button"
              onClick={() => onChange(Math.max(min, value - step))}
              disabled={value <= min}>−</button>
      <span className="step-input__val">{value}{suffix}</span>
      <button className="step-input__btn" type="button"
              onClick={() => onChange(Math.min(max, value + step))}
              disabled={value >= max}>+</button>
    </div>
  )
}

// ── CourseShortcutRow component ────────────────────────────────────────────────
function CourseShortcutRow({ course, updateCourse }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(course.key || '')

  function save() {
    const k = val.trim().toUpperCase()
    if (k && k !== 'A' && /^[B-Z]$/.test(k)) {
      updateCourse(course.id, { key: k })
    }
    setEditing(false)
  }

  return (
    <div className="shortcut-row">
      <span className="shortcut-row__dot" style={{ background: course.color }} />
      <span className="shortcut-row__name">{course.name}</span>
      <div className="shortcut-row__right">
        {editing ? (
          <>
            <input
              className="shortcut-input"
              maxLength={1}
              value={val}
              onChange={(e) => setVal(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
            />
            <button className="icon-btn" onClick={save} title="Save">✓</button>
            <button className="icon-btn" onClick={() => setEditing(false)} title="Cancel">✕</button>
          </>
        ) : (
          <button
            className={`chip-key chip-key--settings ${course.key ? '' : 'chip-key--empty'}`}
            onClick={() => { setVal(course.key || ''); setEditing(true) }}
            title="Click to reassign shortcut"
          >
            {course.key || '—'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
const CSV_HEADERS = [
  'courseId','courseName','topicId','topicName',
  'status','testScore','testDate','lastUpdated','nextReview','interval','repetitions',
  'courseContentUrl','videoUrl','ankiUrl','testUrl',
]

function topicsToCSV(certData, progress) {
  const rows = [CSV_HEADERS.join(',')]
  for (const course of certData.courses) {
    for (const topic of course.topics) {
      const p  = progress[topic.id] || {}
      const sm = p.sm2 || {}
      const row = [
        course.id, course.name, topic.id, `"${topic.name.replace(/"/g,'""')}"`,
        p.status || 'not-started',
        p.testScore ?? '',
        p.testDate  ?? '',
        p.lastUpdated ? p.lastUpdated.split('T')[0] : '',
        sm.nextReview  ?? '',
        sm.interval    ?? '',
        sm.repetitions ?? '',
        topic.resources?.courseContent ?? '',
        topic.resources?.video         ?? '',
        topic.resources?.anki          ?? '',
        topic.resources?.testLink      ?? '',
      ]
      rows.push(row.join(','))
    }
  }
  return rows.join('\n')
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const values = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { values.push(cur); cur = '' }
      else cur += ch
    }
    values.push(cur)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export default function SettingsView({
  certData, progress,
  darkMode, toggleDarkMode,
  setCertName, setTargetDate,
  exportData, importData,
  exportProgress, importProgress,
  clearAllProgress, resetToSample,
  updateTopicResources, setTestScore,
  courses, updateCourse,
  addCourse, addTopic,
  workStart, workEnd, defaultTopicMins, maxSessionsPerDay, defaultBreakMins,
  setWorkStart, setWorkEnd, setDefaultTopicMins, setMaxSessionsPerDay, setDefaultBreakMins,
  allTopics, calendar, exportCalendarCSV, importCalendarCSV, restoreCalendar,
  // Sync metadata
  lastSaved, lastExported, lastImported, syncFilePath,
  stampLastExported, stampLastImported, setSyncFilePath,
  // Revision techniques
  techniques = [], toggleTechniqueActive, exportTechniques, importTechniques,
  resetTechniquesToDefaults, techniquesLastImported,
  // Sub-topics
  subtopicsEnabled, setSubtopicsEnabled,
  // Google Drive sync
  driveSync,
}) {
  const [importText, setImportText]       = useState('')
  const [importError, setImportError]     = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [showImport, setShowImport]       = useState(false)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const lastClickedIdx = useRef(null)

  function flash(setter, msg) { setter(msg); setTimeout(() => setter(''), 4000) }

  function handleImportCert() {
    setImportError('')
    try {
      importData(importText)
      stampLastImported?.()
      setImportText(''); setShowImport(false)
      flash(setImportSuccess, 'Course structure imported!')
    } catch (e) { setImportError(e.message) }
  }

  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setImportText(ev.target.result); setShowImport(true) }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleExportProgress() {
    const data = exportProgress()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `cert-progress-${Date.now()}.json` })
    a.click(); URL.revokeObjectURL(url)
    stampLastExported?.()
  }

  function handleImportProgress(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importProgress(JSON.parse(ev.target.result))
        stampLastImported?.()
        flash(setImportSuccess, 'Progress imported!')
      }
      catch  { flash(setImportError, 'Invalid progress file.') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  function handleExportCSV() {
    const csv  = topicsToCSV(certData, progress)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `cert-tracker-${Date.now()}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  function handleImportCSV(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result)
        // Build a snapshot of existing course/topic ids for this import pass
        // (certData is a closure snapshot; newly added items are queued via
        //  setCertData callbacks so we track them in local sets)
        const knownCourseIds = new Set(certData.courses.map((c) => c.id))
        const knownTopicIds  = new Set(
          certData.courses.flatMap((c) => c.topics.map((t) => t.id))
        )

        let created = 0
        rows.forEach((row) => {
          if (!row.topicId || !row.courseId) return

          // Create course if it doesn't exist yet
          if (!knownCourseIds.has(row.courseId)) {
            addCourse({
              id:   row.courseId,
              name: row.courseName || row.courseId,
            })
            knownCourseIds.add(row.courseId)
            created++
          }

          // Create topic if it doesn't exist yet
          if (!knownTopicIds.has(row.topicId)) {
            addTopic(row.courseId, {
              id:   row.topicId,
              name: row.topicName || row.topicId,
            })
            knownTopicIds.add(row.topicId)
            created++
          }

          // Update resources
          updateTopicResources(row.topicId, {
            courseContent: row.courseContentUrl || '',
            video:         row.videoUrl         || '',
            anki:          row.ankiUrl          || '',
            testLink:      row.testUrl          || '',
          })

          // Update test score if present
          if (row.testScore !== '') {
            const n = Number(row.testScore)
            if (!isNaN(n)) setTestScore(row.topicId, n, row.testDate || null)
          }
        })

        const msg = created > 0
          ? `CSV imported — ${rows.length} rows, ${created} new items created.`
          : `CSV imported — ${rows.length} rows updated.`
        flash(setImportSuccess, msg)
      } catch (err) { flash(setImportError, `CSV error: ${err.message}`) }
    }
    reader.readAsText(file); e.target.value = ''
  }

  function handleExportCalendarCSV() {
    const csv = exportCalendarCSV(allTopics, certData, progress)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `calendar-${Date.now()}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  function handleImportCalendarCSV(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importCalendarCSV(ev.target.result, allTopics)
        flash(setImportSuccess, 'Calendar imported!')
      } catch (err) { flash(setImportError, `Calendar CSV error: ${err.message}`) }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Full-data export (for sync) ───────────────────────────────────────────
  function handleFullExport() {
    const bundle = {
      _type: 'cert-tracker-full',
      version: 1,
      exportedAt: new Date().toISOString(),
      certData,
      progress,
      calendar,
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cert-tracker-full-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    stampLastExported?.()
  }

  function handleFullImportFile(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        if (raw._type === 'cert-tracker-full') {
          if (raw.certData)  importData(JSON.stringify(raw.certData))
          if (raw.progress)  importProgress(raw.progress)
          if (raw.calendar)  restoreCalendar?.(raw.calendar)
        } else {
          // Fallback: treat as structure-only export
          importData(ev.target.result)
        }
        stampLastImported?.()
        flash(setImportSuccess, 'Full data imported from file!')
      } catch (err) { flash(setImportError, `Import error: ${err.message}`) }
    }
    reader.readAsText(file); e.target.value = ''
  }

  function fmtTimestamp(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const totalTopics = certData.courses.reduce((s, c) => s + c.topics.length, 0)
  const totalTerms  = (certData.terminology || []).length

  function handleTileClick(course, idx, e) {
    if (e.shiftKey && lastClickedIdx.current !== null) {
      // Shift+click: toggle all courses between lastClickedIdx and current
      const start = Math.min(lastClickedIdx.current, idx)
      const end = Math.max(lastClickedIdx.current, idx)
      for (let i = start; i <= end; i++) {
        updateCourse(courses[i].id, { hidden: !courses[i].hidden })
      }
    } else {
      // Normal click: toggle this one
      updateCourse(course.id, { hidden: !course.hidden })
    }
    lastClickedIdx.current = idx
  }

  function handleShowAll() {
    courses.forEach((c) => updateCourse(c.id, { hidden: false }))
  }

  function handleHideAll() {
    courses.forEach((c) => updateCourse(c.id, { hidden: true }))
  }

  return (
    <div className="settings-view">
      <h2 className="study-title">⚙️ Settings</h2>

      {importError   && <div className="alert alert-error">{importError}</div>}
      {importSuccess && <div className="alert alert-success">{importSuccess}</div>}

      {/* Certification */}
      <div className="settings-section">
        <div className="settings-section-title">Certification</div>
        <div className="settings-row">
          <div><div className="settings-label">Cert Name</div></div>
          <input className="settings-input" type="text" value={certData.certName}
                 onChange={(e) => setCertName(e.target.value)}
                 style={{ minWidth: 260, flex: 1 }} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Target Date</div>
            <div className="settings-hint">Set your exam target date for the progress countdown</div>
          </div>
          <input className="settings-input" type="date" value={certData.targetDate || ''}
                 onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Overview</div>
            <div className="settings-hint">{certData.courses.length} courses · {totalTopics} topics · {totalTerms} terms</div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <div className="settings-row">
          <div><div className="settings-label">Dark Mode</div><div className="settings-hint">Toggle dark / light theme</div></div>
          <label className="toggle">
            <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Study Structure */}
      <div className="settings-section">
        <div className="settings-section-title">Study Structure</div>
        <div className="settings-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="settings-label">Enable Sub-topics</div>
            <div className="settings-hint">
              Adds an optional sub-topic level beneath each topic — useful when topics have distinct syllabus points
              (e.g. Paper 1 → Plate Tectonics, Coastal Landforms…). Progress and study cards track individual sub-topics.
            </div>
          </div>
          <label className="toggle" style={{ flexShrink: 0 }}>
            <input type="checkbox" checked={!!subtopicsEnabled}
                   onChange={(e) => setSubtopicsEnabled?.(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        {subtopicsEnabled && (
          <div className="settings-hint" style={{ padding: '0 16px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            ℹ️ In Topics view, click <strong>＋ Sub</strong> on any topic group header to add sub-topics.
            Topics that already have sub-topics show their sub-topics as individual trackable rows.
          </div>
        )}
      </div>

      {/* Google Drive Sync */}
      {driveSync && <DriveSyncSection driveSync={driveSync} />}

      {/* Courses */}
      <div className="settings-section">
        <div className="settings-section-title">Courses</div>
        <div className="settings-hint" style={{ padding: '0 16px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
          Hidden courses won't appear in the filter bar or chip shortcuts. Shift+click to toggle multiple.
        </div>
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleShowAll}>Show All</button>
          <button className="btn btn-secondary btn-sm" onClick={handleHideAll}>Hide All</button>
        </div>
        <div className="course-settings-grid">
          {courses.map((course, idx) => (
            <button
              key={course.id}
              className={`course-settings-tile ${course.hidden ? 'course-settings-tile--hidden' : ''}`}
              onClick={(e) => handleTileClick(course, idx, e)}
              title={course.hidden ? 'Click to show (Shift+click to select range)' : 'Click to hide (Shift+click to select range)'}
            >
              <span className="course-settings-dot" style={{ background: course.color }} />
              <span className="course-settings-name">{course.name}</span>
              <span className="course-settings-status">{course.hidden ? 'Hidden' : 'Visible'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Course keyboard shortcuts */}
      <div className="settings-section">
        <div className="settings-section-title">Course Keyboard Shortcuts</div>
        <div className="settings-hint" style={{ padding: '0 16px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
          Single letters instantly toggle that course filter. Reserved: A (All). Click a badge to reassign.
        </div>
        <div className="shortcut-list">
          {courses.map((course) => (
            <CourseShortcutRow key={course.id} course={course} updateCourse={updateCourse} />
          ))}
        </div>
      </div>

      {/* Calendar Defaults */}
      <div className="settings-section">
        <div className="settings-section-title">Calendar Defaults</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Working Hours Start</div>
            <div className="settings-hint">Time of day when your study schedule begins</div>
          </div>
          <input className="settings-input" type="time" value={workStart}
                 onChange={(e) => setWorkStart(e.target.value)} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Working Hours End</div>
            <div className="settings-hint">Time of day when your study schedule ends</div>
          </div>
          <input className="settings-input" type="time" value={workEnd}
                 onChange={(e) => setWorkEnd(e.target.value)} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Default Topic Duration</div>
            <div className="settings-hint">Minutes per topic when auto-filling calendar (per-topic overrides in Calendar view)</div>
          </div>
          <StepInput value={defaultTopicMins} onChange={setDefaultTopicMins} min={15} max={180} step={15} suffix=" min" />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Max Sessions Per Day</div>
            <div className="settings-hint">Maximum number of topics auto-scheduled per day</div>
          </div>
          <StepInput value={maxSessionsPerDay} onChange={setMaxSessionsPerDay} min={1} max={20} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Default Break Between Sessions</div>
            <div className="settings-hint">Minutes of break added between auto-scheduled topics (0 = no break)</div>
          </div>
          <StepInput value={defaultBreakMins ?? 0} onChange={setDefaultBreakMins} min={0} max={60} step={15} suffix=" min" />
        </div>
      </div>

      {/* CSV */}
      <div className="settings-section">
        <div className="settings-section-title">CSV Import / Export</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Export CSV</div>
            <div className="settings-hint">Download all topics with resources, scores, and study data as a spreadsheet</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>⬇ Export CSV</button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Import CSV</div>
            <div className="settings-hint">Update resource links and test scores from a CSV file (matches on Topic ID)</div>
          </div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📂 Import CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
          </label>
        </div>
      </div>

      {/* Calendar */}
      <div className="settings-section">
        <div className="settings-section-title">Calendar</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Export Calendar CSV</div>
            <div className="settings-hint">Download scheduled sessions as a spreadsheet</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCalendarCSV}>⬇ Export CSV</button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Import Calendar CSV</div>
            <div className="settings-hint">Re-import a previously exported calendar CSV</div>
          </div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📂 Import CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCalendarCSV} />
          </label>
        </div>
      </div>

      {/* Course Structure */}
      <div className="settings-section">
        <div className="settings-section-title">Course Structure (JSON)</div>
        <div className="settings-row">
          <div><div className="settings-label">Export Structure</div><div className="settings-hint">Course topics and structure only — no progress, scores or calendar data</div></div>
          <button className="btn btn-secondary btn-sm" onClick={exportData}>⬇ Export JSON</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-label">Import JSON</div><div className="settings-hint">Replace structure from a JSON file</div></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              📂 Load File
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </label>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(!showImport)}>📋 Paste JSON</button>
          </div>
        </div>
        {showImport && (
          <div style={{ padding: '0 16px 16px' }}>
            <textarea className="import-area"
                      placeholder={'Paste cert JSON here...\n\n{ "certName": "...", "courses": [...] }'}
                      value={importText} onChange={(e) => setImportText(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowImport(false); setImportText('') }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleImportCert} disabled={!importText.trim()}>Import</button>
            </div>
          </div>
        )}
        <div className="settings-row">
          <div><div className="settings-label">Reset to Sample Data</div><div className="settings-hint">Restore GCP Professional Architect example</div></div>
          {showConfirmReset ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConfirmReset(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => { resetToSample(); setShowConfirmReset(false) }}>Confirm Reset</button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowConfirmReset(true)}>Reset</button>
          )}
        </div>
      </div>

      {/* Data Sync */}
      <div className="settings-section">
        <div className="settings-section-title">Data Sync</div>
        <div className="settings-hint" style={{ padding: '0 16px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
          Use these timestamps to compare which device has the latest data. Export on the newer device, import on the older one. Set a sync file path as a reminder of where to save/load your backup.
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Last Saved</div>
            <div className="settings-hint">Most recent time any data was changed on this device</div>
          </div>
          <span className="sync-timestamp">{fmtTimestamp(lastSaved)}</span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Last Exported</div>
            <div className="settings-hint">Last time data was exported from this device</div>
          </div>
          <span className="sync-timestamp">{fmtTimestamp(lastExported)}</span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Last Imported</div>
            <div className="settings-hint">Last time data was imported on this device</div>
          </div>
          <span className="sync-timestamp">{fmtTimestamp(lastImported)}</span>
        </div>
        <div className="settings-row" style={{ alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div className="settings-label">Sync File Path</div>
            <div className="settings-hint">Memo: where you save your sync file (e.g. Google Drive path)</div>
          </div>
          <input className="settings-input" type="text"
                 value={syncFilePath ?? ''}
                 placeholder="e.g. G:\My Drive\cert-tracker\backup.json"
                 onChange={(e) => setSyncFilePath?.(e.target.value)}
                 style={{ minWidth: 280, flex: 1 }} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Export Full Data</div>
            <div className="settings-hint">All data — courses, study progress, scores and calendar — for syncing between devices</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleFullExport}>⬇ Export JSON</button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Import Full Data</div>
            <div className="settings-hint">Restore all data from a full sync export — courses, progress, scores and calendar</div>
          </div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📂 Import JSON
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleFullImportFile} />
          </label>
        </div>
      </div>

      {/* Revision Techniques */}
      <div className="settings-section">
        <div className="settings-section-title">Revision Techniques</div>
        <div className="settings-hint" style={{ padding: '0 16px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
          These techniques appear in the <strong>Last / Next Revision</strong> dropdowns on the Study page.
          Toggle techniques on/off, or export the list as JSON, edit it to add your own, then re-import.
          {techniquesLastImported && (
            <span className="sync-timestamp" style={{ marginLeft: 8 }}>
              Last imported: {fmtTimestamp(techniquesLastImported)}
            </span>
          )}
        </div>

        {/* Techniques table */}
        <div className="rev-tech-settings-wrap">
          <table className="rev-tech-settings-table">
            <thead>
              <tr>
                <th style={{ width: 32, textAlign: 'center' }}>On</th>
                <th style={{ width: 140 }}>Name</th>
                <th>Method</th>
                <th>Why it works</th>
              </tr>
            </thead>
            <tbody>
              {techniques.map((t) => (
                <tr key={t.id} className={t.active ? '' : 'rev-tech-row--inactive'}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={t.active}
                           onChange={() => toggleTechniqueActive?.(t.id)}
                           title={t.active ? 'Disable technique' : 'Enable technique'} />
                  </td>
                  <td className="rev-tech-name">{t.name}</td>
                  <td className="rev-tech-cell">{t.method}</td>
                  <td className="rev-tech-cell">{t.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions row */}
        <div className="settings-row" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div className="settings-label">Manage Techniques</div>
            <div className="settings-hint">Export to JSON → edit to add/rename/reorder → re-import</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportTechniques}>⬇ Export JSON</button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              📂 Import JSON
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => {
                const file = e.target.files[0]; if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  try { importTechniques?.(ev.target.result); flash(setImportSuccess, 'Techniques imported!') }
                  catch (err) { flash(setImportError, `Import error: ${err.message}`) }
                }
                reader.readAsText(file); e.target.value = ''
              }} />
            </label>
            <button className="btn btn-secondary btn-sm"
                    onClick={() => { if (window.confirm('Reset techniques to defaults?')) resetTechniquesToDefaults?.() }}>
              ↺ Reset defaults
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="settings-section">
        <div className="settings-section-title">Progress Data</div>
        <div className="settings-row">
          <div><div className="settings-label">Export Progress</div><div className="settings-hint">Download study progress (statuses, SM-2, scores)</div></div>
          <button className="btn btn-secondary btn-sm" onClick={handleExportProgress}>⬇ Export</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-label">Import Progress</div><div className="settings-hint">Restore previously exported progress</div></div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📂 Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportProgress} />
          </label>
        </div>
        <div className="settings-row">
          <div><div className="settings-label">Clear All Progress</div><div className="settings-hint">Reset all topics to Not Started</div></div>
          <button className="btn btn-danger btn-sm"
                  onClick={() => { if (window.confirm('Clear all progress?')) clearAllProgress() }}>
            🗑 Clear
          </button>
        </div>
      </div>
    </div>
  )
}
