# Cert Tracker

A keyboard-first study progress tracker for professional certification exams. Built with React + Vite, all data stored locally in the browser — no backend required.

Inspired by [keydeck](https://github.com/grand-afk/keydeck).

---

## Features

### 📋 Topics
Track every exam topic across multiple course modules. Each topic has:
- **Status** — cycle between Not Started / In Progress / Complete (click the badge)
- **Test Score** — record your practice test score and date (inline edit)
- **Resources** — link to course content, video, Anki deck, and practice test
- **SM-2 Spaced Repetition** — Again / Hard / Good / Easy ratings automatically schedule reviews
- **Add / Delete topics** — use the ＋ Add Topic button or the 🗑 delete button per row
- **Sort** by course, topic name, status, score, or last updated
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
- Toggle between "due only" and "show all"

### ⚙️ Settings
- **Courses** — show or hide individual courses from the filter bar
- **Course Keyboard Shortcuts** — view and reassign per-course letter keys
- **Target Date** — set your exam date; the progress banner counts down
- **Dark / Light mode** toggle
- **CSV Import / Export** — full data round-trip for topics (resources, scores, SM-2)
- **JSON Import / Export** — backup or share the full cert structure
- **Progress Import / Export** — backup and restore study progress separately
- **Reset to Sample Data** — restore the default GCP Professional Architect example

---

## Keyboard Shortcuts

### Navigation (bottom tabs)
| Key | Tab |
|-----|-----|
| `1` | Topics |
| `2` | Terminology |
| `3` | Study |
| `4` | Settings |

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
│   ├── BottomNav.jsx        # 4-tab navigation with key hints
│   ├── ProgressBanner.jsx   # Overall % complete + days to exam
│   ├── TopicsView.jsx       # Topics table with sort, paginate, add/delete
│   ├── TerminologyView.jsx  # Glossary table with add/delete
│   ├── StudyView.jsx        # SM-2 review queue
│   ├── SettingsView.jsx     # All settings including course visibility & shortcuts
│   ├── AddTopicModal.jsx    # Modal for adding a new topic
│   ├── AddTermModal.jsx     # Modal for adding a new term
│   ├── RateButtons.jsx      # Again/Hard/Good/Easy SM-2 rating buttons
│   ├── EditResourceModal.jsx# Modal for editing resource links
│   └── ResourceTooltip.jsx  # Hover tooltip showing resource links
├── hooks/
│   ├── useCertData.js       # Cert structure state + localStorage
│   ├── useProgress.js       # Topic/term progress + SM-2 + test scores
│   └── useSettings.js       # Dark mode + course filter selections
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
    "sm2": {
      "interval": 6, "repetitions": 2, "easeFactor": 2.5,
      "nextReview": "2026-03-29", "lastRated": "2026-03-23T09:00:00.000Z",
      "lastQuality": 4
    }
  }
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

## Mobile

The app is responsive down to 375px wide:
- Course chips scroll horizontally
- Tables scroll horizontally with a minimum width
- Keyboard key hints are hidden on small screens
- Settings rows stack vertically
- Bottom nav compresses to icon + label only
