import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useCertData }             from './hooks/useCertData'
import { useProgress }             from './hooks/useProgress'
import { useSettings }             from './hooks/useSettings'
import { useCalendar }             from './hooks/useCalendar'
import { useHistory }              from './hooks/useHistory'
import { useRevisionTechniques }   from './hooks/useRevisionTechniques'
import { useCerts, migrateToNamespace } from './hooks/useCerts'
import TopBar           from './components/TopBar'
import BottomNav        from './components/BottomNav'
import ProgressBanner   from './components/ProgressBanner'
import TopicsView       from './components/TopicsView'
import TerminologyView  from './components/TerminologyView'
import StudyView        from './components/StudyView'
import CalendarView     from './components/CalendarView'
import HelpView         from './components/HelpView'
import SettingsView     from './components/SettingsView'
import sampleDataEngineer from './data/sample-data-engineer.json'
import sampleCloudArchitect from './data/sample.json'
import sampleGCSE         from './data/sample-gcse.json'
import sampleGCSEProgress from './data/sample-gcse-progress.json'

// Run migration once (moves old un-namespaced keys → 'default' namespace)
migrateToNamespace()

// Template definitions used in the Add form
const CERT_TEMPLATES = [
  { value: 'blank',          label: 'Blank',                      emoji: '🎓', suggestName: '' },
  { value: 'cloud-architect', label: 'GCP Cloud Architect (sample)', emoji: '☁️', suggestName: 'GCP Cloud Architect' },
  { value: 'data-engineer',  label: 'GCP Data Engineer (sample)',  emoji: '📊', suggestName: 'GCP Data Engineer' },
  { value: 'gcse',           label: 'GCSE Revision (sample)',      emoji: '📚', suggestName: 'GCSE Revision' },
]

// ── Add / Manage Cert Modal ───────────────────────────────────────────────────
function CertManagerModal({ certs, activeCertId, onSwitch, onAdd, onRename, onDelete, onClose }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🎓')
  const [newTemplate, setNewTemplate] = useState('blank')
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [renameEmoji, setRenameEmoji] = useState('')

  function handleAdd() {
    if (!newName.trim()) return
    const id = onAdd(newName.trim(), newEmoji, newTemplate)
    onSwitch(id)
    onClose()
  }

  function handleTemplateChange(value) {
    setNewTemplate(value)
    const tpl = CERT_TEMPLATES.find((t) => t.value === value)
    if (tpl) {
      // Pre-fill name and emoji from template if user hasn't typed yet
      if (!newName || CERT_TEMPLATES.some((t) => t.suggestName === newName)) {
        setNewName(tpl.suggestName)
      }
      setNewEmoji(tpl.emoji)
    }
  }

  function startRename(cert) {
    setRenamingId(cert.id)
    setRenameVal(cert.name)
    setRenameEmoji(cert.emoji || '🎓')
  }

  function saveRename() {
    if (renameVal.trim()) onRename(renamingId, renameVal.trim(), renameEmoji)
    setRenamingId(null)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ minWidth: 360 }}>
        <div className="modal-title">My Certifications</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {certs.map((cert) => (
            <div key={cert.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {renamingId === cert.id ? (
                <>
                  <input value={renameEmoji} onChange={(e) => setRenameEmoji(e.target.value)}
                    style={{ width: 44, textAlign: 'center' }} className="form-input" />
                  <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                    className="form-input" style={{ flex: 1 }}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenamingId(null) }}
                    autoFocus />
                  <button className="btn btn-primary btn-sm" onClick={saveRename}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setRenamingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button
                    className={`cert-list-item${cert.id === activeCertId ? ' cert-list-item--active' : ''}`}
                    onClick={() => { onSwitch(cert.id); onClose() }}
                    title={cert.id === activeCertId ? 'Currently active' : `Switch to ${cert.name}`}
                  >
                    <span>{cert.emoji || '🎓'}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{cert.name}</span>
                    <span className={`cert-status-badge${cert.id === activeCertId ? ' cert-status-badge--active' : ''}`}>
                      {cert.id === activeCertId ? '● active' : 'switch →'}
                    </span>
                  </button>
                  <button className="btn btn-secondary btn-sm" title="Rename" onClick={() => startRename(cert)}>
                    Rename
                  </button>
                  {certs.length > 1 && (
                    <button className="btn btn-secondary btn-sm" title="Delete"
                      style={{ color: '#EA4335', borderColor: '#EA4335' }}
                      onClick={() => { if (window.confirm(`Delete "${cert.name}"? This cannot be undone.`)) { onDelete(cert.id, activeCertId, onSwitch); onClose() } }}>
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {adding ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Add New Certification</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, opacity: 0.7 }}>Start from:</label>
              {CERT_TEMPLATES.map(({ value, label }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="template" value={value}
                    checked={newTemplate === value} onChange={() => handleTemplateChange(value)} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
                style={{ width: 44, textAlign: 'center' }} className="form-input" placeholder="🎓" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="form-input" style={{ flex: 1 }} placeholder="Certification name…"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => { setAdding(false); setNewName(''); setNewEmoji('🎓'); setNewTemplate('blank') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>Add Certification</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAdding(true)}>
            ＋ Add Certification
          </button>
        )}

        <div className="modal-footer" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

const VIEWS = ['topics', 'study', 'calendar', 'terminology', 'help', 'settings']
const STATUSES = ['not-started', 'in-progress', 'complete']

// ── CertWorkspace: all data hooks + views for a single cert namespace ─────────
function CertWorkspace({ namespace, activeCert, certs, addCert, renameCert, deleteCert, switchCert, activeCertId, view, setView, searchQuery, setSearchQuery }) {
  const {
    certData, setCertName, setTargetDate,
    updateTopicResources, updateTermResources,
    updateTopicNotes, updateTermNotes,
    updateSubtopicNotes, updateSubtopicResources,
    addTopic, deleteTopic,
    addSubtopic, deleteSubtopic,
    addCourse, updateCourse, addTerm, deleteTerm,
    exportData, importData, resetToSample,
    getAllTopics, getAllItems, restoreCertData,
    setTopicDueDate,
  } = useCertData(namespace)

  const {
    progress,
    getStatus, cycleStatus, setStatus,
    getLastUpdated, computePercent,
    getSm2Card, rateCard, clearRating,
    getTestScore, setTestScore,
    getTopicMins, setTopicMins,
    exportProgress, importProgress, clearAll,
    restoreProgress,
    getRevisionTechnique, setRevisionTechnique,
  } = useProgress(namespace)

  const {
    darkMode, toggleDarkMode, selectedCourses, toggleCourse, clearSelectedCourses,
    workStart, workEnd, defaultTopicMins, maxSessionsPerDay, defaultBreakMins,
    setWorkStart, setWorkEnd, setDefaultTopicMins, setMaxSessionsPerDay, setDefaultBreakMins,
    subtopicsEnabled, setSubtopicsEnabled,
    lastSaved, lastExported, lastImported, syncFilePath,
    stampLastSaved, stampLastExported, stampLastImported, setSyncFilePath,
  } = useSettings(namespace)

  const { calendar, exportCSV: exportCalendarCSV, importCSV: importCalendarCSV, restoreCalendar } = useCalendar(namespace)

  const { push: historyPush, undo, redo, canUndo, canRedo } = useHistory()

  const {
    techniques: revisionTechniques,
    toggleActive: toggleTechniqueActive,
    exportTechniques,
    importTechniques,
    resetToDefaults: resetTechniquesToDefaults,
    lastImported: techniquesLastImported,
  } = useRevisionTechniques(namespace)

  const [managingCerts, setManagingCerts] = useState(false)

  const allTopics  = useMemo(() => getAllTopics(), [getAllTopics])
  // allItems: flat list used by Topics + Study views. When subtopicsEnabled and a topic
  // has subtopics, subtopic rows replace their parent topic. Otherwise identical to allTopics.
  const allItems   = useMemo(() => getAllItems(subtopicsEnabled), [getAllItems, subtopicsEnabled])
  // Map id → item for fast lookup in smart handlers below
  const allItemsMap = useMemo(() => {
    const m = {}
    allItems.forEach((item) => { m[item.id] = item })
    return m
  }, [allItems])

  const allItemIds  = useMemo(() => allItems.map((t) => t.id), [allItems])
  const allTermIds  = useMemo(() => (certData.terminology || []).map((t) => t.id), [certData])
  const allIds      = useMemo(() => [...allItemIds, ...allTermIds], [allItemIds, allTermIds])
  const percentComplete = useMemo(() => computePercent(allIds), [allIds, progress])

  // Auto-stamp lastSaved whenever certData, progress, or calendar mutates (skip initial mount)
  const hasHydrated = useRef(false)
  useEffect(() => {
    if (!hasHydrated.current) { hasHydrated.current = true; return }
    stampLastSaved()
  }, [certData, progress, calendar]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived: topics that have a due date set (for CalendarView milestones)
  const topicDueDates = useMemo(
    () => allTopics.filter((t) => t.dueDate),
    [allTopics]
  )

  // Derived: per-course latest due date (for ProgressBanner ticks)
  const courseMilestones = useMemo(() => {
    const byCoure = {}
    allTopics.forEach((t) => {
      if (!t.dueDate) return
      if (!byCoure[t.courseId] || t.dueDate > byCoure[t.courseId].latestDueDate) {
        byCoure[t.courseId] = { courseId: t.courseId, courseName: t.courseName, courseColor: t.courseColor, latestDueDate: t.dueDate }
      }
    })
    return Object.values(byCoure)
  }, [allTopics])

  // Sync bar props — passed to TopicsView and StudyView
  const syncProps = useMemo(() => ({
    certData, progress, calendar,
    importData, importProgress, restoreCalendar,
    stampLastExported, stampLastImported,
    lastSaved, lastExported, lastImported, syncFilePath,
  }), [certData, progress, calendar, importData, importProgress, restoreCalendar,
       stampLastExported, stampLastImported, lastSaved, lastExported, lastImported, syncFilePath])

  // Clear search when changing views
  useEffect(() => { setSearchQuery('') }, [view])

  // ── History-aware action wrappers ─────────────────────────────────────────
  const cycleStatusH = useCallback((id) => {
    const prev = getStatus(id)
    const next = STATUSES[(STATUSES.indexOf(prev) + 1) % STATUSES.length]
    cycleStatus(id)
    historyPush(
      () => setStatus(id, prev),
      () => setStatus(id, next),
      `Status ${id}`
    )
  }, [getStatus, cycleStatus, setStatus, historyPush])

  const rateCardH = useCallback((id, quality) => {
    const prevEntry = JSON.parse(JSON.stringify(progress[id] || {}))
    rateCard(id, quality)
    historyPush(
      () => restoreProgress({ ...progress, [id]: prevEntry }),
      () => rateCard(id, quality),
      `Rate ${id}`
    )
  }, [progress, rateCard, restoreProgress, historyPush])

  const clearRatingH = useCallback((id) => {
    const prevEntry = JSON.parse(JSON.stringify(progress[id] || {}))
    clearRating(id)
    historyPush(
      () => restoreProgress({ ...progress, [id]: prevEntry }),
      () => clearRating(id),
      `ClearRating ${id}`
    )
  }, [progress, clearRating, restoreProgress, historyPush])

  const updateTopicNotesH = useCallback((topicId, notes) => {
    const prevNotes = allTopics.find((t) => t.id === topicId)?.notes ?? ''
    updateTopicNotes(topicId, notes)
    historyPush(
      () => updateTopicNotes(topicId, prevNotes),
      () => updateTopicNotes(topicId, notes),
      `Notes ${topicId}`
    )
  }, [allTopics, updateTopicNotes, historyPush])

  const updateTermNotesH = useCallback((termId, notes) => {
    const prevNotes = (certData.terminology || []).find((t) => t.id === termId)?.notes ?? ''
    updateTermNotes(termId, notes)
    historyPush(
      () => updateTermNotes(termId, prevNotes),
      () => updateTermNotes(termId, notes),
      `TermNotes ${termId}`
    )
  }, [certData.terminology, updateTermNotes, historyPush])

  const addTopicH = useCallback((courseId, topicData) => {
    const prevCertData = JSON.parse(JSON.stringify(certData))
    addTopic(courseId, topicData)
    historyPush(
      () => restoreCertData(prevCertData),
      () => addTopic(courseId, topicData),
      `AddTopic`
    )
  }, [certData, addTopic, restoreCertData, historyPush])

  const deleteTopicH = useCallback((courseId, topicId) => {
    const prevCertData = JSON.parse(JSON.stringify(certData))
    deleteTopic(courseId, topicId)
    historyPush(
      () => restoreCertData(prevCertData),
      () => deleteTopic(courseId, topicId),
      `DeleteTopic`
    )
  }, [certData, deleteTopic, restoreCertData, historyPush])

  // ── Item-aware handlers (work for both topics and subtopics) ─────────────
  // MUST be placed after deleteTopicH and updateTopicNotesH to avoid const TDZ errors.
  const updateItemResources = useCallback((id, resources) => {
    const item = allItemsMap[id]
    if (item?.isSub) {
      updateSubtopicResources(item.courseId, item.topicId, id, resources)
    } else {
      updateTopicResources(id, resources)
    }
  }, [allItemsMap, updateSubtopicResources, updateTopicResources])

  const updateItemNotesH = useCallback((id, notes) => {
    const item = allItemsMap[id]
    if (item?.isSub) {
      updateSubtopicNotes(item.courseId, item.topicId, id, notes)
    } else {
      updateTopicNotesH(id, notes)
    }
  }, [allItemsMap, updateSubtopicNotes, updateTopicNotesH])

  const deleteItemH = useCallback((courseId, id) => {
    const item = allItemsMap[id]
    if (item?.isSub) {
      deleteSubtopic(item.courseId, item.topicId, id)
    } else {
      deleteTopicH(courseId, id)
    }
  }, [allItemsMap, deleteSubtopic, deleteTopicH])

  const addTermH = useCallback((termData) => {
    const prevCertData = JSON.parse(JSON.stringify(certData))
    addTerm(termData)
    historyPush(
      () => restoreCertData(prevCertData),
      () => addTerm(termData),
      `AddTerm`
    )
  }, [certData, addTerm, restoreCertData, historyPush])

  const deleteTermH = useCallback((termId) => {
    const prevCertData = JSON.parse(JSON.stringify(certData))
    deleteTerm(termId)
    historyPush(
      () => restoreCertData(prevCertData),
      () => deleteTerm(termId),
      `DeleteTerm`
    )
  }, [certData, deleteTerm, restoreCertData, historyPush])

  // Calendar undo/redo
  const recordCalendarAction = useCallback((undoFn, redoFn, label = 'Calendar') => {
    historyPush(undoFn, redoFn, label)
  }, [historyPush])

  // addCert handler: seed template data SYNCHRONOUSLY before returning the id.
  // This ensures the data is in localStorage before onSwitch(id) triggers a re-render
  // of CertWorkspace — so useCertData reads the correct data on its first initialisation,
  // not the default sample fallback.
  const handleAddCert = useCallback((name, emoji, template) => {
    const id = addCert(name, emoji)
    try {
      if (template === 'cloud-architect') {
        // Stamp the user's chosen name so the TopBar shows it, not the template's internal certName
        const seeded = { ...sampleCloudArchitect, certName: name || sampleCloudArchitect.certName }
        localStorage.setItem(`certTracker_${id}_certData`, JSON.stringify(seeded))
      } else if (template === 'data-engineer') {
        const seeded = { ...sampleDataEngineer, certName: name || sampleDataEngineer.certName }
        localStorage.setItem(`certTracker_${id}_certData`, JSON.stringify(seeded))
      } else if (template === 'gcse') {
        const seeded = { ...sampleGCSE, certName: name || sampleGCSE.certName }
        localStorage.setItem(`certTracker_${id}_certData`, JSON.stringify(seeded))
        // Pre-seed progress data from spreadsheet (SM-2 cards + statuses)
        localStorage.setItem(`certTracker_${id}_progress`, JSON.stringify(sampleGCSEProgress))
        // Pre-enable subtopics since the data is structured with subtopics
        try {
          const settingsKey = `certTracker_${id}_settings`
          const existing = JSON.parse(localStorage.getItem(settingsKey) || '{}')
          localStorage.setItem(settingsKey, JSON.stringify({ ...existing, subtopicsEnabled: true }))
        } catch {}
      } else {
        // Blank cert: seed a minimal structure so useCertData doesn't fall back to the built-in sample
        const blank = { certName: name, targetDate: '', courses: [], terminology: [] }
        localStorage.setItem(`certTracker_${id}_certData`, JSON.stringify(blank))
      }
    } catch {}
    return id
  }, [addCert])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); return }
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); return }
        return
      }

      if (e.altKey) return
      if (e.key === 'Escape') { clearSelectedCourses(); setSearchQuery(''); return }

      if (e.key === '/') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-search'))
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        window.dispatchEvent(new CustomEvent('add-shortcut'))
        return
      }

      if (view === 'calendar') {
        if (/^[dDwWmM]$/.test(e.key)) {
          window.dispatchEvent(new CustomEvent('calendar-key', { detail: e.key.toLowerCase() }))
          return
        }
        if (/^[sSxXtT]$/.test(e.key)) return
      }

      const navIdx = parseInt(e.key, 10)
      if (navIdx >= 1 && navIdx <= VIEWS.length) { setView(VIEWS[navIdx - 1]); return }

      if (/^[a-zA-Z]$/.test(e.key)) {
        if (e.key.toUpperCase() === 'A') { clearSelectedCourses(); return }
        const course = certData.courses.find(
          (c) => c.key && c.key.toUpperCase() === e.key.toUpperCase()
        )
        if (course) { toggleCourse(course.id); return }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [certData.courses, toggleCourse, clearSelectedCourses, view, undo, redo])

  return (
    <>
      <TopBar
        certName={activeCert?.name || certData.certName}
        certEmoji={activeCert?.emoji || '🎓'}
        certs={certs}
        activeCertId={activeCertId}
        onManageCerts={() => setManagingCerts(true)}
        courses={certData.courses}
        selectedCourses={selectedCourses}
        toggleCourse={toggleCourse}
        clearSelectedCourses={clearSelectedCourses}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentView={view}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <ProgressBanner percent={percentComplete} targetDate={certData.targetDate} courseMilestones={courseMilestones} />

      <main className="main-content">
        {view === 'topics' && (
          <TopicsView
            topics={allItems}
            courses={certData.courses}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            cycleStatus={cycleStatusH}
            getLastUpdated={getLastUpdated}
            updateTopicResources={updateItemResources}
            updateTopicNotes={updateItemNotesH}
            getTestScore={getTestScore}
            setTestScore={setTestScore}
            setTopicDueDate={setTopicDueDate}
            addTopic={addTopicH}
            deleteTopic={deleteItemH}
            subtopicsEnabled={subtopicsEnabled}
            addSubtopic={addSubtopic}
            clearRating={clearRatingH}
            searchQuery={searchQuery}
            syncProps={syncProps}
          />
        )}

        {view === 'terminology' && (
          <TerminologyView
            terminology={certData.terminology || []}
            courses={certData.courses}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            cycleStatus={cycleStatusH}
            getLastUpdated={getLastUpdated}
            updateTermResources={updateTermResources}
            updateTermNotes={updateTermNotesH}
            addTerm={addTermH}
            deleteTerm={deleteTermH}
            clearRating={clearRatingH}
            searchQuery={searchQuery}
          />
        )}

        {view === 'study' && (
          <StudyView
            topics={allItems}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            getSm2Card={getSm2Card}
            rateCard={rateCardH}
            clearRating={clearRatingH}
            getLastUpdated={getLastUpdated}
            updateTopicResources={updateItemResources}
            updateTopicNotes={updateItemNotesH}
            searchQuery={searchQuery}
            revisionTechniques={revisionTechniques}
            getRevisionTechnique={getRevisionTechnique}
            setRevisionTechnique={setRevisionTechnique}
            syncProps={syncProps}
            subtopicsEnabled={subtopicsEnabled}
          />
        )}

        {view === 'calendar' && (
          <CalendarView
            allTopics={allTopics}
            courses={certData.courses}
            getSm2Card={getSm2Card}
            getStatus={getStatus}
            getTopicMins={getTopicMins}
            workStart={workStart}
            workEnd={workEnd}
            defaultTopicMins={defaultTopicMins}
            defaultBreakMins={defaultBreakMins}
            rateCard={rateCardH}
            clearRating={clearRatingH}
            maxSessionsPerDay={maxSessionsPerDay}
            addCourse={addCourse}
            addTopic={addTopic}
            updateTopicNotes={updateTopicNotesH}
            updateTopicResources={updateTopicResources}
            searchQuery={searchQuery}
            recordAction={recordCalendarAction}
            calendar={calendar}
            restoreCalendar={restoreCalendar}
            topicDueDates={topicDueDates}
          />
        )}

        {view === 'help' && <HelpView />}

        {view === 'settings' && (
          <SettingsView
            certData={certData}
            progress={progress}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            setCertName={setCertName}
            setTargetDate={setTargetDate}
            exportData={exportData}
            importData={importData}
            exportProgress={exportProgress}
            importProgress={importProgress}
            clearAllProgress={clearAll}
            resetToSample={resetToSample}
            updateTopicResources={updateTopicResources}
            setTestScore={setTestScore}
            courses={certData.courses}
            updateCourse={updateCourse}
            addCourse={addCourse}
            addTopic={addTopic}
            workStart={workStart}
            workEnd={workEnd}
            defaultTopicMins={defaultTopicMins}
            maxSessionsPerDay={maxSessionsPerDay}
            defaultBreakMins={defaultBreakMins}
            setWorkStart={setWorkStart}
            setWorkEnd={setWorkEnd}
            setDefaultTopicMins={setDefaultTopicMins}
            setMaxSessionsPerDay={setMaxSessionsPerDay}
            setDefaultBreakMins={setDefaultBreakMins}
            allTopics={allTopics}
            calendar={calendar}
            exportCalendarCSV={exportCalendarCSV}
            importCalendarCSV={importCalendarCSV}
            restoreCalendar={restoreCalendar}
            lastSaved={lastSaved}
            lastExported={lastExported}
            lastImported={lastImported}
            syncFilePath={syncFilePath}
            stampLastExported={stampLastExported}
            stampLastImported={stampLastImported}
            setSyncFilePath={setSyncFilePath}
            techniques={revisionTechniques}
            toggleTechniqueActive={toggleTechniqueActive}
            exportTechniques={exportTechniques}
            importTechniques={importTechniques}
            resetTechniquesToDefaults={resetTechniquesToDefaults}
            techniquesLastImported={techniquesLastImported}
            subtopicsEnabled={subtopicsEnabled}
            setSubtopicsEnabled={setSubtopicsEnabled}
          />
        )}
      </main>

      <BottomNav view={view} setView={setView} />

      {managingCerts && (
        <CertManagerModal
          certs={certs}
          activeCertId={activeCertId}
          onSwitch={switchCert}
          onAdd={handleAddCert}
          onRename={(id, name, emoji) => {
              renameCert(id, name, emoji)
              // Keep certData.certName in sync so exports use the latest name
              if (id === activeCertId) setCertName(name)
            }}
          onDelete={deleteCert}
          onClose={() => setManagingCerts(false)}
        />
      )}
    </>
  )
}

// ── App shell: cert list + active cert routing ────────────────────────────────
export default function App() {
  const { certs, activeCertId, activeCert, addCert, renameCert, deleteCert, switchCert } = useCerts()
  const [view, setView]               = useState('topics')
  const [searchQuery, setSearchQuery] = useState('')

  // Reset view to topics when switching certs
  const handleSwitchCert = useCallback((id) => {
    switchCert(id)
    setView('topics')
    setSearchQuery('')
  }, [switchCert])

  return (
    <div className="app">
      <CertWorkspace
        key={activeCertId}
        namespace={activeCertId}
        activeCert={activeCert}
        certs={certs}
        addCert={addCert}
        renameCert={renameCert}
        deleteCert={deleteCert}
        switchCert={handleSwitchCert}
        activeCertId={activeCertId}
        view={view}
        setView={setView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  )
}
