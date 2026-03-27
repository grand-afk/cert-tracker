import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useCertData }             from './hooks/useCertData'
import { useProgress }             from './hooks/useProgress'
import { useSettings }             from './hooks/useSettings'
import { useCalendar }             from './hooks/useCalendar'
import { useHistory }              from './hooks/useHistory'
import { useRevisionTechniques }   from './hooks/useRevisionTechniques'
import TopBar           from './components/TopBar'
import BottomNav        from './components/BottomNav'
import ProgressBanner   from './components/ProgressBanner'
import TopicsView       from './components/TopicsView'
import TerminologyView  from './components/TerminologyView'
import StudyView        from './components/StudyView'
import CalendarView     from './components/CalendarView'
import HelpView         from './components/HelpView'
import SettingsView     from './components/SettingsView'

function RenameCertModal({ current, onSave, onClose }) {
  const [val, setVal] = useState(current)
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Rename Certification</div>
        <div className="form-group">
          <label className="form-label">Cert Name</label>
          <input className="form-input" value={val} onChange={(e) => setVal(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { onSave(val); onClose() } }} autoFocus />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSave(val); onClose() }}>Save</button>
        </div>
      </div>
    </div>
  )
}

const VIEWS = ['topics', 'study', 'calendar', 'terminology', 'help', 'settings']
const STATUSES = ['not-started', 'in-progress', 'complete']

export default function App() {
  const [view, setView]             = useState('topics')
  const [renamingCert, setRenamingCert] = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')

  const {
    certData, setCertName, setTargetDate,
    updateTopicResources, updateTermResources,
    updateTopicNotes, updateTermNotes,
    addTopic, deleteTopic,
    addCourse, updateCourse, addTerm, deleteTerm,
    exportData, importData, resetToSample,
    getAllTopics, restoreCertData,
    setTopicDueDate,
  } = useCertData()

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
  } = useProgress()

  const {
    darkMode, toggleDarkMode, selectedCourses, toggleCourse, clearSelectedCourses,
    workStart, workEnd, defaultTopicMins, maxSessionsPerDay, defaultBreakMins,
    setWorkStart, setWorkEnd, setDefaultTopicMins, setMaxSessionsPerDay, setDefaultBreakMins,
    lastSaved, lastExported, lastImported, syncFilePath,
    stampLastSaved, stampLastExported, stampLastImported, setSyncFilePath,
  } = useSettings()

  const { calendar, exportCSV: exportCalendarCSV, importCSV: importCalendarCSV, restoreCalendar } = useCalendar()

  const { push: historyPush, undo, redo, canUndo, canRedo } = useHistory()

  const {
    techniques: revisionTechniques,
    toggleActive: toggleTechniqueActive,
    exportTechniques,
    importTechniques,
    resetToDefaults: resetTechniquesToDefaults,
    lastImported: techniquesLastImported,
  } = useRevisionTechniques()

  const allTopics  = useMemo(() => getAllTopics(), [getAllTopics])
  const allTopicIds = useMemo(() => allTopics.map((t) => t.id), [allTopics])
  const allTermIds  = useMemo(() => (certData.terminology || []).map((t) => t.id), [certData])
  const allIds      = useMemo(() => [...allTopicIds, ...allTermIds], [allTopicIds, allTermIds])
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

  // Calendar undo/redo: CalendarView calls this with its own before/after snapshots
  const recordCalendarAction = useCallback((undoFn, redoFn, label = 'Calendar') => {
    historyPush(undoFn, redoFn, label)
  }, [historyPush])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Ctrl+Z = undo, Ctrl+Y = redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); return }
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); return }
        return
      }

      if (e.altKey) return
      if (e.key === 'Escape') { clearSelectedCourses(); setSearchQuery(''); return }

      // / key → focus global search
      if (e.key === '/') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-search'))
        return
      }

      // N key → open Add modal on current page
      if (e.key === 'n' || e.key === 'N') {
        window.dispatchEvent(new CustomEvent('add-shortcut'))
        return
      }

      // Calendar view shortcuts — handled by CalendarView's own listeners.
      // D/W/M: dispatch via custom event so CalendarView can handle view-switching.
      // S/X: CalendarView's keydown handler handles Schedule/Clear directly; return
      //   early here to prevent S/X from reaching the course-chip shortcut handler
      //   (the sample data uses S=Storage which would conflict otherwise).
      if (view === 'calendar') {
        if (/^[dDwWmM]$/.test(e.key)) {
          window.dispatchEvent(new CustomEvent('calendar-key', { detail: e.key.toLowerCase() }))
          return
        }
        // S, X, T are reserved for Schedule / Clear / Today on this view
        if (/^[sSxXtT]$/.test(e.key)) return
      }

      // Bottom nav: 1-6
      const navIdx = parseInt(e.key, 10)
      if (navIdx >= 1 && navIdx <= VIEWS.length) { setView(VIEWS[navIdx - 1]); return }

      // Course chips: letter keys
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
    <div className="app">
      <TopBar
        certName={certData.certName}
        courses={certData.courses}
        selectedCourses={selectedCourses}
        toggleCourse={toggleCourse}
        clearSelectedCourses={clearSelectedCourses}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onEditCertName={() => setRenamingCert(true)}
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
            topics={allTopics}
            courses={certData.courses}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            cycleStatus={cycleStatusH}
            getLastUpdated={getLastUpdated}
            updateTopicResources={updateTopicResources}
            updateTopicNotes={updateTopicNotesH}
            getTestScore={getTestScore}
            setTestScore={setTestScore}
            setTopicDueDate={setTopicDueDate}
            addTopic={addTopicH}
            deleteTopic={deleteTopicH}
            clearRating={clearRatingH}
            searchQuery={searchQuery}
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
            topics={allTopics}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            getSm2Card={getSm2Card}
            rateCard={rateCardH}
            clearRating={clearRatingH}
            getLastUpdated={getLastUpdated}
            updateTopicResources={updateTopicResources}
            updateTopicNotes={updateTopicNotesH}
            searchQuery={searchQuery}
            revisionTechniques={revisionTechniques}
            getRevisionTechnique={getRevisionTechnique}
            setRevisionTechnique={setRevisionTechnique}
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
          />
        )}
      </main>

      <BottomNav view={view} setView={setView} />

      {renamingCert && (
        <RenameCertModal
          current={certData.certName}
          onSave={setCertName}
          onClose={() => setRenamingCert(false)}
        />
      )}
    </div>
  )
}
