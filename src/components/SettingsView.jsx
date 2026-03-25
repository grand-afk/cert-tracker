import { useState, useRef } from 'react'

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
  allTopics, calendar, exportCalendarCSV, importCalendarCSV,
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
  }

  function handleImportProgress(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try { importProgress(JSON.parse(ev.target.result)); flash(setImportSuccess, 'Progress imported!') }
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
          <input className="settings-input" type="number" min={15} max={180} step={15} value={defaultTopicMins}
                 onChange={(e) => setDefaultTopicMins(Math.max(15, Math.round(parseInt(e.target.value) / 15) * 15))} style={{ width: 80 }} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Max Sessions Per Day</div>
            <div className="settings-hint">Maximum number of topics auto-scheduled per day</div>
          </div>
          <input className="settings-input" type="number" min={1} max={20}
                 value={maxSessionsPerDay}
                 onChange={(e) => setMaxSessionsPerDay(parseInt(e.target.value))} style={{ width: 80 }} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Default Break Between Sessions</div>
            <div className="settings-hint">Minutes of break added between auto-scheduled topics (0 = no break)</div>
          </div>
          <input className="settings-input" type="number" min={0} max={60} step={15}
                 defaultValue={defaultBreakMins ?? 0}
                 key={defaultBreakMins}
                 onBlur={(e) => setDefaultBreakMins(Math.round(Math.max(0, parseInt(e.target.value) || 0) / 15) * 15)}
                 onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                 style={{ width: 80 }} />
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
          <div><div className="settings-label">Export JSON</div><div className="settings-hint">Download full cert structure</div></div>
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
