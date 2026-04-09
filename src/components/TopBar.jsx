import { useState, useEffect, useRef } from 'react'

function relTime(iso) {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 5)   return 'just now'
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function TopBar({
  certName,
  certEmoji,
  certs,
  activeCertId,
  onManageCerts,
  courses,
  selectedCourses,
  toggleCourse,
  clearSelectedCourses,
  darkMode,
  toggleDarkMode,
  searchQuery,
  setSearchQuery,
  currentView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onLoad,
  isSaving,
  isLoading,
  driveConnected,
  lastSaved,
  lastExported,
  lastImported,
  onGoToSettings,
}) {
  const [, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 30_000); return () => clearInterval(id) }, [])

  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)

  // Focus search when global event fires (/ key)
  useEffect(() => {
    function onFocusSearch() {
      setSearchOpen(true)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
    window.addEventListener('focus-search', onFocusSearch)
    return () => window.removeEventListener('focus-search', onFocusSearch)
  }, [])

  function toggleSearch() {
    if (searchOpen) {
      setSearchOpen(false)
      setSearchQuery('')
    } else {
      setSearchOpen(true)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-row1">
        <button className="cert-switcher-btn" onClick={onManageCerts} title="Switch or manage certifications">
          <span className="cert-switcher-emoji">{certEmoji}</span>
          <span className="cert-switcher-name">{certName}</span>
          {certs && certs.length > 1 && (
            <span className="cert-switcher-count">{certs.length}</span>
          )}
          <span className="cert-switcher-arrow">▾</span>
        </button>

        {searchOpen && (
          <div className="topbar-search-wrap">
            <input
              ref={searchRef}
              className="topbar-search-input"
              placeholder="Search topics, courses…  [/]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); e.target.blur() }
              }}
            />
            {searchQuery && (
              <button className="topbar-search-clear" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>
        )}

        <div className="topbar-icons">
          {currentView !== 'settings' && (
            <button
              className={`topbar-icon-btn topbar-icon-btn--with-key ${searchOpen ? 'topbar-icon-btn--active' : ''}`}
              onClick={toggleSearch}
              title="Search  [/]"
              aria-label="Toggle search"
            >
              🔍<span className="topbar-btn-key">/</span>
            </button>
          )}
          {onSave && (
            <button
              className="topbar-icon-btn topbar-icon-btn--with-key"
              onClick={onSave}
              disabled={isSaving || isLoading}
              title={`${driveConnected ? 'Save to Google Drive' : 'Save to file'}  [Ctrl+S]`}
              aria-label="Save"
              style={{ opacity: (isSaving || isLoading) ? 0.5 : 1, fontSize: 15 }}
            >
              {isSaving ? '⏳' : driveConnected ? '☁️' : '💾'}<span className="topbar-btn-key">S</span>
            </button>
          )}
          {onLoad && (
            <button
              className="topbar-icon-btn topbar-icon-btn--with-key"
              onClick={onLoad}
              disabled={isSaving || isLoading}
              title={`${driveConnected ? 'Load from Google Drive' : 'Load from file'}  [Ctrl+L]`}
              aria-label="Load"
              style={{ opacity: (isSaving || isLoading) ? 0.5 : 1, fontSize: 15 }}
            >
              {isLoading ? '⏳' : '📂'}<span className="topbar-btn-key">L</span>
            </button>
          )}
          <button
            className="topbar-icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo  [Ctrl+Z]"
            aria-label="Undo"
            style={{ opacity: canUndo ? 1 : 0.35, fontSize: 16 }}
          >
            ↩
          </button>
          <button
            className="topbar-icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo  [Ctrl+Y]"
            aria-label="Redo"
            style={{ opacity: canRedo ? 1 : 0.35, fontSize: 16 }}
          >
            ↪
          </button>
          {onGoToSettings && (
            <button
              className={`topbar-drive-status ${driveConnected ? 'topbar-drive-status--connected' : 'topbar-drive-status--disconnected'}`}
              onClick={onGoToSettings}
              title={driveConnected ? 'Google Drive connected — click to manage in Settings' : 'Google Drive not connected — click to configure in Settings'}
              aria-label={driveConnected ? 'Google Drive connected' : 'Google Drive not connected'}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
                <path d="M4.5 20.25L8 14h13.5l-3.5 6.25H4.5z" opacity=".5"/>
                <path d="M14.5 3.75L8 14H1l6.5-10.25h7z" opacity=".7"/>
                <path d="M21.5 14L18 8l-3.5-4.25L21 8l.5 6z" opacity=".9"/>
              </svg>
              <span className="topbar-drive-label">Drive</span>
            </button>
          )}
          <button
            className="topbar-icon-btn"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      {/* Tiny timestamp strip — shows changed/saved/loaded times */}
      {(lastSaved || lastExported || lastImported) && (
        <div className="topbar-stamps">
          {lastSaved    && <span className="topbar-stamp topbar-stamp--changed"  title="Last local change">changed {relTime(lastSaved)}</span>}
          {lastExported && <span className="topbar-stamp topbar-stamp--saved"    title="Last saved">{driveConnected ? '☁️' : '💾'} {relTime(lastExported)}</span>}
          {lastImported && <span className="topbar-stamp topbar-stamp--imported" title="Last loaded">📂 {relTime(lastImported)}</span>}
        </div>
      )}

      <div className="topbar-row2">
        <button
          className={`course-chip ${selectedCourses.length === 0 ? 'course-chip--active' : ''}`}
          onClick={clearSelectedCourses}
          title="Show all courses  [A]"
        >
          All <span className="chip-key">A</span>
        </button>

        {courses.filter((c) => !c.hidden).map((course) => (
          <button
            key={course.id}
            className={`course-chip ${selectedCourses.includes(course.id) ? 'course-chip--active' : ''}`}
            onClick={() => toggleCourse(course.id)}
            title={`${course.name}${course.key ? `  [${course.key}]` : ''}`}
          >
            <span className="course-chip__dot" style={{ background: course.color }} />
            {course.name}
            {course.key && <span className="chip-key">{course.key}</span>}
          </button>
        ))}
      </div>
    </header>
  )
}
