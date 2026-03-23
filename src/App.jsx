import { useState, useMemo, useEffect, useCallback } from 'react'
import { useCertData }  from './hooks/useCertData'
import { useProgress }  from './hooks/useProgress'
import { useSettings }  from './hooks/useSettings'
import TopBar           from './components/TopBar'
import BottomNav        from './components/BottomNav'
import ProgressBanner   from './components/ProgressBanner'
import TopicsView       from './components/TopicsView'
import TerminologyView  from './components/TerminologyView'
import StudyView        from './components/StudyView'
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

const VIEWS = ['topics', 'terminology', 'study', 'settings']

export default function App() {
  const [view, setView]             = useState('topics')
  const [renamingCert, setRenamingCert] = useState(false)

  const {
    certData, setCertName, setTargetDate,
    updateTopicResources, updateTermResources,
    addTopic, deleteTopic,
    addCourse, updateCourse, addTerm, deleteTerm,
    exportData, importData, resetToSample,
    getAllTopics,
  } = useCertData()

  const {
    progress,
    getStatus, cycleStatus, setStatus,
    getLastUpdated, computePercent,
    getSm2Card, rateCard,
    getTestScore, setTestScore,
    exportProgress, importProgress, clearAll,
  } = useProgress()

  const { darkMode, toggleDarkMode, selectedCourses, toggleCourse, clearSelectedCourses } = useSettings()

  const allTopics  = useMemo(() => getAllTopics(), [getAllTopics])
  const allTopicIds = useMemo(() => allTopics.map((t) => t.id), [allTopics])
  const allTermIds  = useMemo(() => (certData.terminology || []).map((t) => t.id), [certData])
  const allIds      = useMemo(() => [...allTopicIds, ...allTermIds], [allTopicIds, allTermIds])
  const percentComplete = useMemo(() => computePercent(allIds), [allIds, progress])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { clearSelectedCourses(); return }

      // Bottom nav: 1-4
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
  }, [certData.courses, toggleCourse, clearSelectedCourses])

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
      />

      <ProgressBanner percent={percentComplete} targetDate={certData.targetDate} />

      <main className="main-content">
        {view === 'topics' && (
          <TopicsView
            topics={allTopics}
            courses={certData.courses}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            cycleStatus={cycleStatus}
            getLastUpdated={getLastUpdated}
            updateTopicResources={updateTopicResources}
            getTestScore={getTestScore}
            setTestScore={setTestScore}
            addTopic={addTopic}
            deleteTopic={deleteTopic}
          />
        )}

        {view === 'terminology' && (
          <TerminologyView
            terminology={certData.terminology || []}
            courses={certData.courses}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            cycleStatus={cycleStatus}
            getLastUpdated={getLastUpdated}
            updateTermResources={updateTermResources}
            addTerm={addTerm}
            deleteTerm={deleteTerm}
          />
        )}

        {view === 'study' && (
          <StudyView
            topics={allTopics}
            selectedCourses={selectedCourses}
            getStatus={getStatus}
            getSm2Card={getSm2Card}
            rateCard={rateCard}
            getLastUpdated={getLastUpdated}
            updateTopicResources={updateTopicResources}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            certData={certData}
            progress={progress}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
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
