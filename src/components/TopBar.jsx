import { useState, useEffect, useRef } from 'react'

export default function TopBar({
  certName,
  courses,
  selectedCourses,
  toggleCourse,
  clearSelectedCourses,
  darkMode,
  toggleDarkMode,
  onEditCertName,
  searchQuery,
  setSearchQuery,
}) {
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
        <button className="cert-title-btn" onClick={onEditCertName} title="Click to rename cert">
          🎓 {certName}
          <span className="edit-hint">✎</span>
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
          <button
            className={`topbar-icon-btn ${searchOpen ? 'topbar-icon-btn--active' : ''}`}
            onClick={toggleSearch}
            title="Search  [/]"
            aria-label="Toggle search"
          >
            🔍
          </button>
          <button
            className="topbar-icon-btn"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

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
