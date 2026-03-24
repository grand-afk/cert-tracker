export default function HelpView() {
  return (
    <div className="help-view">
      <h1 className="help-title">❓ Help</h1>

      {/* Features Section */}
      <div className="help-section">
        <h2 className="help-section-title">Features</h2>
        <div className="help-cards">
          <div className="help-card">
            <div className="help-card-icon">📋</div>
            <div className="help-card-title">Topics</div>
            <div className="help-card-text">
              Track every exam topic across multiple courses. View status, test scores, resources, and SM-2 spaced repetition scheduling.
            </div>
          </div>

          <div className="help-card">
            <div className="help-card-icon">🎓</div>
            <div className="help-card-title">Study</div>
            <div className="help-card-text">
              A dedicated review queue sorted by SM-2 due date. Rate cards with Again/Hard/Good/Easy to automatically schedule your next review.
            </div>
          </div>

          <div className="help-card">
            <div className="help-card-icon">📅</div>
            <div className="help-card-title">Calendar</div>
            <div className="help-card-text">
              Plan your study schedule in day, week, or month view. Drag topics to time slots, set study hours, and auto-fill with the most overdue topics.
            </div>
          </div>

          <div className="help-card">
            <div className="help-card-icon">📖</div>
            <div className="help-card-title">Terms</div>
            <div className="help-card-text">
              Build a glossary of key certification terms with definitions, resources, and status tracking alongside your topics.
            </div>
          </div>

          <div className="help-card">
            <div className="help-card-icon">⚙️</div>
            <div className="help-card-title">Settings</div>
            <div className="help-card-text">
              Manage course visibility, keyboard shortcuts, calendar defaults, dark mode, and import/export your data as JSON or CSV.
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Section */}
      <div className="help-section">
        <h2 className="help-section-title">Keyboard Shortcuts</h2>
        <div className="help-shortcut-section">
          <h3 className="help-subsection-title">Navigation</h3>
          <table className="help-shortcut-table">
            <tbody>
              <tr><td><kbd>1</kbd></td><td>Topics</td></tr>
              <tr><td><kbd>2</kbd></td><td>Study</td></tr>
              <tr><td><kbd>3</kbd></td><td>Calendar</td></tr>
              <tr><td><kbd>4</kbd></td><td>Terms</td></tr>
              <tr><td><kbd>5</kbd></td><td>Help</td></tr>
              <tr><td><kbd>6</kbd></td><td>Settings</td></tr>
            </tbody>
          </table>
        </div>

        <div className="help-shortcut-section">
          <h3 className="help-subsection-title">Course Filters</h3>
          <table className="help-shortcut-table">
            <tbody>
              <tr><td><kbd>A</kbd></td><td>Show all courses</td></tr>
              <tr><td><kbd>Esc</kbd></td><td>Clear filter</td></tr>
              <tr><td><kbd>A-Z</kbd></td><td>Toggle individual course (configurable in Settings)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="help-shortcut-section">
          <h3 className="help-subsection-title">Study View</h3>
          <table className="help-shortcut-table">
            <tbody>
              <tr><td><kbd>F</kbd></td><td>Toggle "Due only" / "Show all"</td></tr>
            </tbody>
          </table>
        </div>

        <div className="help-shortcut-section">
          <h3 className="help-subsection-title">Calendar</h3>
          <table className="help-shortcut-table">
            <tbody>
              <tr><td><kbd>D</kbd></td><td>Day view</td></tr>
              <tr><td><kbd>W</kbd></td><td>Week view</td></tr>
              <tr><td><kbd>M</kbd></td><td>Month view</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="help-section">
        <h2 className="help-section-title">Getting Started</h2>
        <div className="help-text">
          <p>
            Cert Tracker is a keyboard-first study progress tracker for professional certifications. All data is stored locally in your browser — no backend required.
          </p>
          <p>
            <strong>Start with Topics:</strong> Add your courses and topics (or import from CSV). Each topic can have links to course content, videos, Anki decks, and practice tests.
          </p>
          <p>
            <strong>Track Progress:</strong> Use the Study view to review cards using SM-2 spaced repetition. Rate each card based on how well you recall it — the algorithm automatically schedules your next review.
          </p>
          <p>
            <strong>Plan Your Schedule:</strong> Use the Calendar to visualize your study schedule. Drag topics into time slots, or let auto-fill arrange your most overdue topics into available study hours.
          </p>
          <p>
            <strong>Set Your Target:</strong> In Settings, set your exam target date. The progress banner will count down the days and show your overall completion percentage.
          </p>
        </div>
      </div>

      {/* About Section */}
      <div className="help-section">
        <h2 className="help-section-title">About</h2>
        <div className="help-text">
          <p>
            Cert Tracker is built with React + Vite and inspired by{' '}
            <a href="https://github.com/grand-afk/keydeck" target="_blank" rel="noopener noreferrer">
              keydeck
            </a>
            .
          </p>
          <p>
            All features run entirely in your browser. Your data never leaves your device — it's all stored in localStorage.
          </p>
        </div>
      </div>
    </div>
  )
}
