# Cert Tracker

A keyboard-first study progress tracker for professional certification exams. Built with React + Vite, all data stored locally in the browser — no backend required.

Inspired by [keydeck](https://github.com/grand-afk/keydeck).

---

## Features

### 📋 Topics
Track every exam topic across multiple course modules. Each topic has:
- **Status** — cycle between Not Started / In Progress / Complete (click the badge)
- **Test Score** — record your practice test score and date (inline edit)
- **Due Date** — set a target deadline per topic (date + optional time, in 15-minute steps); displays relative label ("in 3d", "Today", "2d overdue"); sortable column
- **Resources** — link to course content, video, Anki deck, and practice test
- **SM-2 Spaced Repetition** — Again / Hard / Good / Easy ratings automatically schedule reviews
- **Last Revision / Next Revision** — track which revision technique was used and plan the next one; dropdowns show active techniques from the Revision Techniques config
- **Add / Delete topics** — use the ＋ Add Topic button or the 🗑 delete button per row
- **Sort** by course, topic name, status, score, due date, or last updated
- **Column visibility** — toggle individual columns on/off via the column bar (Score, Due, Last Revision, Next Revision, Updated); state is persisted per-device
- **Pagination** — 15 topics per page

### 📖 Terminology
Manage a glossary of key terms alongside your topics.
- **Add terms** with definition and optional course associations
- **Delete terms** with confirmation
- **Status tracking** per term (same cycle as topics)
- **Resources** — link to docs, video, Anki per term
- Sort by term name, status, or last updated

### 🎓 Study (Spaced Repetition)
A dedicated review queue sorted by SM-2 due date — overdue and new cards always appear first.
- **Again / Hard / Good / Easy** ratings update the SM-2 schedule automatically
  - Good / Easy → marks topic as Complete
  - Hard → marks as In Progress
- **Due badge** shows how many days until review (or overdue count)
- Toggle between "due only" and "show all" (keyboard: `F`)
- **Sort** by course, topic name, due date, or last rating
- **Last Revision / Next Revision** columns — log which technique you used and plan the next session; shown automatically when revision techniques are configured

### 📅 Calendar
Plan your study schedule with three interactive views.
- **Day view** — time slots from working hours start to end
- **Week view** — 7 columns with all topics for the week
- **Month view** — calendar grid with topic counts per day; milestone dots shown on due dates
- **Drag & drop** topics to different time slots or days
- **Auto-fill** — populates study hours with most-overdue topics first (respects per-topic duration overrides)
- **Study hours** — set hours per day to control auto-fill capacity
- **Keyboard shortcuts** — `D` day, `W` week, `M` month, `T` today, `S` schedule, `X` clear, `←`/`→` prev/next
- **Due date milestones** — topic deadlines appear automatically in the calendar:
  - *Timed milestones* (topic has a date + time): rendered as a slim ⚑ card in the time grid alongside study sessions
  - *All-day milestones* (date only): shown in a reserved strip at the top of each day column
  - Multiple topics on same day/course are grouped ("GKE — 3 Due"); mixed courses show "Various Topics — N Due"
- **CSV export** — download schedule as spreadsheet including Notes, Rating, and all resource links
- **Per-topic duration** — override default study duration in Calendar view

### ⚙️ Settings
- **Courses** — show or hide individual courses from the filter bar (Show All / Hide All buttons, Shift+click for range select)
- **Course Keyboard Shortcuts** — view and reassign per-course letter keys
- **Calendar Defaults** — working hours start/end, default topic duration (±15 min steps), default break between sessions (±15 min steps), max sessions per day — all via stepper controls (no freetext number inputs)
- **Target Date** — set your exam date; the progress banner counts down with per-course milestone ticks
- **Dark / Light mode** toggle
- **Revision Techniques** — enable/disable individual techniques; Export JSON / Import JSON for sharing across devices; Reset to defaults; displays last-imported timestamp
- **Export Structure** — JSON export of the cert structure (courses + topics) only
- **Export Full Data** — single JSON bundle containing cert structure, study progress, and calendar (recommended for full backups and device sync)
- **Import Full Data** — restore from a full-data bundle; partial JSON (cert structure only) is also accepted
- **CSV Import / Export** — full data round-trip for topics (resources, scores, SM-2)
- **Progress Import / Export** — backup and restore study progress separately
- **Reset to Sample Data** — restore the default GCP Professional Architect example
- **Data Sync** — compare *Last Saved / Last Exported / Last Imported* timestamps between devices to know which is newer; store a *Sync File Path* as a memo

### 🧠 Revision Techniques
Six evidence-based techniques are built in, each with a method description and rationale:

| Technique | Method |
|-----------|--------|
| Active Recall | Close notes; retrieve from memory or answer questions from scratch |
| Spaced Repetition | Review at increasing intervals (1d → 3d → 1w → 1m) |
| Blurting | Read for 10 min, then write everything remembered on a blank page |
| Dual Coding | Combine words with diagrams, timelines, or icons |
| The Feynman Technique | Explain the concept out loud as if teaching a 10-year-old |
| Interleaving | Mix different subjects in one session rather than blocking one all day |

Techniques can be enabled/disabled in Settings and are described in full in the Help view.

### ❓ Help
Interactive guide covering:
- Feature overview with icons and descriptions
- Complete keyboard shortcut reference (navigation, course filters, study, calendar)
- Revision Techniques reference table with method and rationale for each technique
- Getting started guide
- Links to external resources (GitHub)

---

## Keyboard Shortcuts

### Navigation (bottom tabs)
| Key | Tab |
|-----|-----|
| `1` | Topics |
| `2` | Study |
| `3` | Calendar |
| `4` | Terms |
| `5` | Help |
| `6` | Settings |

### Course Chip Filters (configurable in Settings)
| Key | Default Course |
|-----|----------------|
| `A` | All (clear filter) |
| `G` | GKE |
| `C` | Cloud Run |
| `N` | Networking |
| `I` | IAM |
| `S` | Storage |
| `D` | Databases |
| `Esc` | Clear filter (same as A) |

> Keys are shown on each chip. Reassign any key in Settings → Course Keyboard Shortcuts.

### Study View
| Key | Action |
|-----|--------|
| `F` | Toggle "Due only" / "Show all" |

### Calendar View
| Key | Action |
|-----|--------|
| `D` | Switch to day view |
| `W` | Switch to week view |
| `M` | Switch to month view |
| `T` | Jump to today |
| `S` | Schedule current view |
| `X` | Clear current view |
| `←` | Previous day / week / month |
| `→` | Next day / week / month |
| `Delete` | Remove selected session |
| `Tab` | Cycle through sessions |
| `Enter` | Open edit modal on focused session |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

Open `http://localhost:5173` (or the port shown in the terminal).

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| Vitest | Unit testing |
| @testing-library/react | Component testing |
| localStorage | All persistence (no backend) |

---

## Project Structure

```
src/
├── App.jsx                  # Root component, keyboard shortcuts, routing
├── index.css                # All styles (CSS custom properties, dark/light)
├── components/
│   ├── TopBar.jsx           # Cert title + course chip filters
│   ├── BottomNav.jsx        # 6-tab navigation with key hints
│   ├── ProgressBanner.jsx   # Overall % complete + days to exam
│   ├── TopicsView.jsx       # Topics table with sort, paginate, add/delete
│   ├── TerminologyView.jsx  # Glossary table with add/delete
│   ├── StudyView.jsx        # SM-2 review queue with F key toggle
│   ├── CalendarView.jsx     # Day/Week/Month views with drag & drop scheduling
│   ├── HelpView.jsx         # Help guide with features and shortcuts
│   ├── SettingsView.jsx     # All settings including course visibility, calendar defaults
│   ├── AddTopicModal.jsx    # Modal for adding a new topic
│   ├── AddTermModal.jsx     # Modal for adding a new term
│   ├── RateButtons.jsx      # Again/Hard/Good/Easy SM-2 rating buttons
│   ├── EditResourceModal.jsx# Modal for editing resource links
│   └── ResourceTooltip.jsx  # Hover tooltip showing resource links
├── hooks/
│   ├── useCertData.js           # Cert structure state + localStorage
│   ├── useProgress.js           # Topic/term progress + SM-2 + test scores + revision techniques
│   ├── useSettings.js           # Dark mode + course filter selections + calendar defaults
│   ├── useCalendar.js           # Calendar scheduling + localStorage
│   └── useRevisionTechniques.js # Revision technique list + enable/disable + import/export
├── utils/
│   ├── sm2.js               # SM-2 spaced repetition algorithm
│   └── relativeTime.js      # "just now / Xm ago / Xd ago" formatter
└── data/
    └── sample.json          # Default GCP Professional Architect cert data
```

---

## Data Model

### Cert Structure (localStorage: `certTracker_certData`)
```json
{
  "certName": "Google Professional Cloud Architect",
  "targetDate": "2026-09-30",
  "courses": [
    {
      "id": "gke", "name": "GKE", "color": "#4285F4",
      "key": "G", "hidden": false,
      "topics": [
        {
          "id": "gke-autopilot", "name": "GKE Autopilot",
          "resources": { "courseContent": "", "video": "", "anki": "", "testLink": "" }
        }
      ]
    }
  ],
  "terminology": [
    {
      "id": "term-pod", "term": "Pod", "definition": "Smallest unit in Kubernetes",
      "courses": ["gke"],
      "resources": { "courseContent": "", "video": "", "anki": "", "testLink": "" }
    }
  ]
}
```

### Progress (localStorage: `certTracker_progress`)
```json
{
  "gke-autopilot": {
    "status": "complete",
    "lastUpdated": "2026-03-23T09:00:00.000Z",
    "testScore": 87,
    "testDate": "2026-03-20",
    "topicMins": 45,
    "lastRevTechnique": "active-recall",
    "nextRevTechnique": "feynman",
    "sm2": {
      "interval": 6, "repetitions": 2, "easeFactor": 2.5,
      "nextReview": "2026-03-29", "lastRated": "2026-03-23T09:00:00.000Z",
      "lastQuality": 4
    }
  }
}
```

### Revision Techniques (localStorage: `certTracker_revisionTechniques`)
```json
[
  { "id": "active-recall", "name": "Active Recall", "method": "...", "rationale": "...", "active": true },
  { "id": "spaced-repetition", "name": "Spaced Repetition", "method": "...", "rationale": "...", "active": true }
]
```

### Calendar (localStorage: `certTracker_calendar`)
```json
{
  "2026-03-23": {
    "studyHours": 2,
    "slots": [
      { "id": "slot-...", "topicId": "gke-autopilot", "startTime": "09:00", "durationMins": 30 },
      { "id": "slot-...", "topicId": "gke-networking", "startTime": "09:30", "durationMins": 30 }
    ]
  }
}
```

### Settings (localStorage: `certTracker_settings`)
```json
{
  "darkMode": true,
  "selectedCourses": [],
  "workStart": "09:00",
  "workEnd": "17:00",
  "defaultTopicMins": 30
}
```

---

## Running Tests

```bash
npm test               # Run all tests once
npm test -- --watch   # Watch mode
npm test -- --reporter=verbose   # Detailed output per test
```

The test suite covers: SM-2 algorithm, all hooks, all components, and mobile viewport behaviour.

---

## Calendar CSV Export Format

When exporting from the Calendar view, the CSV file includes the following columns:

| Column | Description |
|--------|-------------|
| Date | Study date in YYYY-MM-DD format |
| StartTime | Session start time in HH:MM format |
| DurationMins | Session duration in minutes |
| TopicId | Topic identifier |
| TopicName | Topic name |
| CourseName | Associated course name |

---

## Mobile

The app is responsive down to 375px wide:
- Course chips scroll horizontally
- Tables scroll horizontally with a minimum width
- Keyboard key hints are hidden on small screens
- Settings rows stack vertically with stepper controls for numeric inputs (no freetext number entry)
- Bottom nav compresses to icon + label only
- Calendar week view scrolls horizontally (7 columns, min 80px each) — no row-wrapping
- Calendar sessions support long-press drag-and-drop (400ms hold, then drag to a new slot)
- Calendar resize handles use pointer events (works for both mouse and touch)
- Calendar tooltips show on tap; tap again to close (desktop hover also works)
- Calendar edit modal is constrained to viewport height with scroll on overflow
- Topics due-date editor commits on tap-outside the row (no explicit save button needed)
