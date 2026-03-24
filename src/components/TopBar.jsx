export default function TopBar({
  certName,
  courses,
  selectedCourses,
  toggleCourse,
  clearSelectedCourses,
  darkMode,
  toggleDarkMode,
  onEditCertName,
}) {
  return (
    <header className="topbar">
      <div className="topbar-row1">
        <button className="cert-title-btn" onClick={onEditCertName} title="Click to rename cert">
          🎓 {certName}
          <span className="edit-hint">✎</span>
        </button>
        <button
          className="topbar-icon-btn"
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
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
