import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StudyView from '../../components/StudyView'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeTopic(id, name, courseId = 'gke', courseName = 'GKE', courseColor = '#4285F4') {
  return {
    id,
    name,
    courseId,
    courseName,
    courseColor,
    resources: { courseContent: '', video: '', anki: '', testLink: '' },
  }
}

const TOPICS = [
  makeTopic('gke-autopilot',  'GKE Autopilot'),
  makeTopic('gke-networking', 'GKE Networking'),
  makeTopic('vpc',            'VPC Design', 'networking', 'Networking', '#FBBC05'),
]

const noop = vi.fn()

function makeCard(daysOffset) {
  if (daysOffset === null) return null // new card
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return {
    interval: 1,
    repetitions: 1,
    easeFactor: 2.5,
    nextReview: d.toISOString().split('T')[0],
  }
}

const defaultProps = {
  topics: TOPICS,
  selectedCourses: [],
  getStatus: () => 'not-started',
  getSm2Card: () => null,
  rateCard: noop,
  clearRating: noop,
  getLastUpdated: () => null,
  updateTopicResources: noop,
  updateTopicNotes: noop,
  searchQuery: '',
}

describe('StudyView', () => {
  it('renders the Study heading', () => {
    render(<StudyView {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /Study/i })).toBeInTheDocument()
  })

  // ── Empty state ───────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('shows "All caught up!" when there are no topics at all', () => {
      render(<StudyView {...defaultProps} topics={[]} />)
      expect(screen.getByText('All caught up!')).toBeInTheDocument()
    })

    it('shows "All caught up!" when "Due only" filter is on and nothing is due', () => {
      const getSm2Card = () => makeCard(5) // all due in 5 days
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      // Activate the "Due only" filter (default is show-all now)
      fireEvent.click(screen.getByRole('button', { name: /Due only/i }))
      expect(screen.getByText('All caught up!')).toBeInTheDocument()
    })

    it('shows "Show all topics" button in empty state', () => {
      const getSm2Card = () => makeCard(5)
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      fireEvent.click(screen.getByRole('button', { name: /Due only/i }))
      expect(screen.getByText('Show all topics')).toBeInTheDocument()
    })

    it('"Show all topics" button turns off the filter', () => {
      const getSm2Card = () => makeCard(5)
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      fireEvent.click(screen.getByRole('button', { name: /Due only/i })) // activate filter → empty
      fireEvent.click(screen.getByText('Show all topics'))                 // deactivate → all shown
      expect(screen.getByText('GKE Autopilot')).toBeInTheDocument()
    })
  })

  // ── Due topics display ────────────────────────────────────────────────────
  describe('due topics', () => {
    it('shows due topics by default (new cards are due)', () => {
      // null card = new = overdue
      render(<StudyView {...defaultProps} />)
      expect(screen.getByText('GKE Autopilot')).toBeInTheDocument()
      expect(screen.getByText('GKE Networking')).toBeInTheDocument()
    })

    it('displays due count in header', () => {
      render(<StudyView {...defaultProps} />)
      expect(screen.getByText(/\d+ due/)).toBeInTheDocument()
    })

    it('shows correct due count for all new topics', () => {
      render(<StudyView {...defaultProps} />)
      expect(screen.getByText(`${TOPICS.length} due`)).toBeInTheDocument()
    })

    it('shows "New" label for topics with no SM-2 card', () => {
      render(<StudyView {...defaultProps} />)
      // Each new topic should show "New"
      const newLabels = screen.getAllByText('New')
      expect(newLabels.length).toBe(TOPICS.length)
    })

    it('shows "Due today" label for topics due today', () => {
      const today = new Date().toISOString().split('T')[0]
      const getSm2Card = () => ({ nextReview: today, interval: 1, repetitions: 1, easeFactor: 2.5 })
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      const labels = screen.getAllByText('Due today')
      expect(labels.length).toBe(TOPICS.length)
    })

    it('shows overdue label for past-due topics', () => {
      const past = new Date()
      past.setDate(past.getDate() - 3)
      const getSm2Card = () => ({ nextReview: past.toISOString().split('T')[0], interval: 1, repetitions: 1, easeFactor: 2.5 })
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      const labels = screen.getAllByText('3d overdue')
      expect(labels.length).toBe(TOPICS.length)
    })
  })

  // ── Show all toggle ───────────────────────────────────────────────────────
  describe('show all toggle', () => {
    it('renders "Due only" filter button (inactive / showing all by default)', () => {
      render(<StudyView {...defaultProps} />)
      // Button always shows "Due only" regardless of state
      expect(screen.getByRole('button', { name: /Due only/i })).toBeInTheDocument()
    })

    it('default shows all topics regardless of due date', () => {
      const future = makeCard(10)
      const getSm2Card = (id) => id === 'gke-autopilot' ? null : future
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      // All shown by default (showDueOnly=false)
      expect(screen.getByText('GKE Autopilot')).toBeInTheDocument()
      expect(screen.getByText('GKE Networking')).toBeInTheDocument()
      expect(screen.getByText('VPC Design')).toBeInTheDocument()
    })

    it('clicking "Due only" hides topics that are not yet due', () => {
      const future = makeCard(10)
      const getSm2Card = (id) => id === 'gke-autopilot' ? null : future
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)

      // Activate "Due only" filter
      fireEvent.click(screen.getByRole('button', { name: /Due only/i }))
      // Now only the due topic is visible
      expect(screen.getByText('GKE Autopilot')).toBeInTheDocument()
      expect(screen.queryByText('GKE Networking')).not.toBeInTheDocument()
      expect(screen.queryByText('VPC Design')).not.toBeInTheDocument()
    })

    it('button label stays "Due only" regardless of filter state', () => {
      render(<StudyView {...defaultProps} />)
      // Initial state — button says "Due only"
      expect(screen.getByRole('button', { name: /Due only/i })).toBeInTheDocument()
      // After activation — still says "Due only"
      fireEvent.click(screen.getByRole('button', { name: /Due only/i }))
      expect(screen.getByRole('button', { name: /Due only/i })).toBeInTheDocument()
    })

    it('clicking "Due only" twice (on then off) restores all topics', () => {
      const future = makeCard(10)
      const getSm2Card = (id) => id === 'gke-autopilot' ? null : future
      render(<StudyView {...defaultProps} getSm2Card={getSm2Card} />)
      const btn = screen.getByRole('button', { name: /Due only/i })
      fireEvent.click(btn) // activate filter
      expect(screen.queryByText('GKE Networking')).not.toBeInTheDocument()
      fireEvent.click(btn) // deactivate
      expect(screen.getByText('GKE Networking')).toBeInTheDocument()
    })
  })

  // ── Rating ────────────────────────────────────────────────────────────────
  describe('rating', () => {
    it('renders Again/Hard/Good/Easy buttons for each due topic', () => {
      render(<StudyView {...defaultProps} />)
      const againBtns = screen.getAllByText('Again')
      expect(againBtns.length).toBe(TOPICS.length)
    })

    it('calls rateCard with topic id and quality when rated', () => {
      const rateCard = vi.fn()
      render(<StudyView {...defaultProps} rateCard={rateCard} />)
      // Click "Good" on the first topic's rate buttons
      fireEvent.click(screen.getAllByText('Good')[0])
      expect(rateCard).toHaveBeenCalledWith('gke-autopilot', 4)
    })

    it('calls rateCard with quality 0 for Again', () => {
      const rateCard = vi.fn()
      render(<StudyView {...defaultProps} rateCard={rateCard} />)
      fireEvent.click(screen.getAllByText('Again')[0])
      expect(rateCard).toHaveBeenCalledWith('gke-autopilot', 0)
    })

    it('calls rateCard with quality 5 for Easy', () => {
      const rateCard = vi.fn()
      render(<StudyView {...defaultProps} rateCard={rateCard} />)
      fireEvent.click(screen.getAllByText('Easy')[0])
      expect(rateCard).toHaveBeenCalledWith('gke-autopilot', 5)
    })
  })

  // ── Course filtering ──────────────────────────────────────────────────────
  describe('course filtering', () => {
    it('filters topics by selectedCourses', () => {
      render(<StudyView {...defaultProps} selectedCourses={['networking']} />)
      expect(screen.getByText('VPC Design')).toBeInTheDocument()
      expect(screen.queryByText('GKE Autopilot')).not.toBeInTheDocument()
    })

    it('shows all topics when selectedCourses is empty', () => {
      render(<StudyView {...defaultProps} selectedCourses={[]} />)
      TOPICS.forEach((t) => {
        expect(screen.getByText(t.name)).toBeInTheDocument()
      })
    })
  })

  // ── Resources ─────────────────────────────────────────────────────────────
  describe('resources', () => {
    it('renders a Resources button for each topic', () => {
      render(<StudyView {...defaultProps} />)
      const resBtns = screen.getAllByRole('button', { name: /resources/i })
      expect(resBtns.length).toBe(TOPICS.length)
    })
  })

  // ── Updated column ────────────────────────────────────────────────────────
  describe('Updated column', () => {
    it('renders an Updated column header', () => {
      render(<StudyView {...defaultProps} />)
      // SortTh renders <th role="button" title="Sort by Updated"> — check by title
      expect(document.querySelector('th[title="Sort by Updated"]')).toBeInTheDocument()
    })

    it('shows "—" when getLastUpdated returns null', () => {
      render(<StudyView {...defaultProps} getLastUpdated={() => null} />)
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })

    it('shows relative time when getLastUpdated returns an ISO string', () => {
      const iso = new Date(Date.now() - 60_000).toISOString() // ~1 min ago
      render(<StudyView {...defaultProps} getLastUpdated={() => iso} />)
      const timeCells = screen.getAllByText(/ago/i)
      expect(timeCells.length).toBeGreaterThan(0)
    })
  })

  // ── Revision techniques ───────────────────────────────────────────────────
  describe('revision techniques', () => {
    const TECHNIQUES = [
      { id: 'active-recall', name: 'Active Recall', method: 'Retrieve info', rationale: 'Strengthens memory', active: true },
      { id: 'blurting',      name: 'Blurting',      method: 'Write it out',  rationale: 'Identifies gaps',   active: true },
    ]

    it('shows Last Revision and Next Revision columns when techniques are provided', () => {
      render(<StudyView {...defaultProps} revisionTechniques={TECHNIQUES}
               getRevisionTechnique={() => null} setRevisionTechnique={noop} />)
      // Headers use <br/> so match by title attribute on the <th>
      expect(document.querySelector('th[title="Technique used last time"]')).toBeInTheDocument()
      expect(document.querySelector('th[title="Technique planned for next session"]')).toBeInTheDocument()
    })

    it('does not show revision columns when no techniques are provided', () => {
      render(<StudyView {...defaultProps} />)
      expect(document.querySelector('th[title="Technique used last time"]')).not.toBeInTheDocument()
      expect(document.querySelector('th[title="Technique planned for next session"]')).not.toBeInTheDocument()
    })

    it('renders a technique dropdown per row when techniques are provided', () => {
      render(<StudyView {...defaultProps} revisionTechniques={TECHNIQUES}
               getRevisionTechnique={() => null} setRevisionTechnique={noop} />)
      // Two columns × N topics = 2N selects
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBe(TOPICS.length * 2)
    })

    it('calls setRevisionTechnique when a dropdown value changes', () => {
      const setRevisionTechnique = vi.fn()
      render(<StudyView {...defaultProps} revisionTechniques={TECHNIQUES}
               getRevisionTechnique={() => null} setRevisionTechnique={setRevisionTechnique} />)
      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'active-recall' } })
      expect(setRevisionTechnique).toHaveBeenCalledWith(
        expect.any(String), expect.any(String), 'active-recall'
      )
    })
  })
})
