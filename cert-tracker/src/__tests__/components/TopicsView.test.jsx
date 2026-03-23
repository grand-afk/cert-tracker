import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import TopicsView from '../../components/TopicsView'

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
  makeTopic('gke-autopilot', 'GKE Autopilot'),
  makeTopic('gke-networking', 'GKE Networking'),
  makeTopic('cloud-build', 'Cloud Build'),
  makeTopic('vpc', 'VPC Design', 'networking', 'Networking', '#FBBC05'),
  makeTopic('iam-roles', 'IAM Roles', 'iam', 'IAM', '#EA4335'),
]

const COURSES = [
  { id: 'gke', name: 'GKE', color: '#4285F4', key: 'G', topics: [] },
  { id: 'networking', name: 'Networking', color: '#FBBC05', key: 'N', topics: [] },
  { id: 'iam', name: 'IAM', color: '#EA4335', key: 'I', topics: [] },
]

const noop = vi.fn()

const defaultProps = {
  topics: TOPICS,
  courses: COURSES,
  selectedCourses: [],
  getStatus: () => 'not-started',
  cycleStatus: noop,
  getLastUpdated: () => null,
  updateTopicResources: noop,
  getTestScore: () => null,
  setTestScore: noop,
  addTopic: noop,
  deleteTopic: noop,
}

describe('TopicsView', () => {
  it('renders the Topics heading', () => {
    render(<TopicsView {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /Topics/i })).toBeInTheDocument()
  })

  it('renders all topics when no course filter is active', () => {
    render(<TopicsView {...defaultProps} />)
    TOPICS.forEach((t) => {
      expect(screen.getByText(t.name)).toBeInTheDocument()
    })
  })

  it('shows 0/N complete count in header', () => {
    render(<TopicsView {...defaultProps} />)
    expect(screen.getByText(`0/${TOPICS.length} complete`)).toBeInTheDocument()
  })

  it('shows correct complete count when some topics are complete', () => {
    const getStatus = (id) => id === 'gke-autopilot' ? 'complete' : 'not-started'
    render(<TopicsView {...defaultProps} getStatus={getStatus} />)
    expect(screen.getByText(`1/${TOPICS.length} complete`)).toBeInTheDocument()
  })

  it('shows in-progress count when some are in progress', () => {
    const getStatus = (id) => id === 'gke-networking' ? 'in-progress' : 'not-started'
    render(<TopicsView {...defaultProps} getStatus={getStatus} />)
    expect(screen.getByText(/1 in progress/)).toBeInTheDocument()
  })

  it('filters topics by selectedCourses', () => {
    render(<TopicsView {...defaultProps} selectedCourses={['gke']} />)
    expect(screen.getByText('GKE Autopilot')).toBeInTheDocument()
    expect(screen.getByText('GKE Networking')).toBeInTheDocument()
    expect(screen.getByText('Cloud Build')).toBeInTheDocument()
    expect(screen.queryByText('VPC Design')).not.toBeInTheDocument()
    expect(screen.queryByText('IAM Roles')).not.toBeInTheDocument()
  })

  it('shows empty state when filtered topics is empty', () => {
    render(<TopicsView {...defaultProps} selectedCourses={['databases']} />)
    expect(screen.getByText('No topics found')).toBeInTheDocument()
  })

  it('renders the course badge for each topic', () => {
    render(<TopicsView {...defaultProps} />)
    const badges = screen.getAllByText('GKE')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('shows "Not Started" status badge by default', () => {
    render(<TopicsView {...defaultProps} />)
    const badges = screen.getAllByText('Not Started')
    expect(badges.length).toBe(TOPICS.length)
  })

  it('shows "In Progress" status for a topic with that status', () => {
    const getStatus = (id) => id === 'gke-autopilot' ? 'in-progress' : 'not-started'
    render(<TopicsView {...defaultProps} getStatus={getStatus} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('shows "Complete" status for a topic with that status', () => {
    const getStatus = (id) => id === 'vpc' ? 'complete' : 'not-started'
    render(<TopicsView {...defaultProps} getStatus={getStatus} />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('calls cycleStatus with the topic id when status badge is clicked', () => {
    const cycleStatus = vi.fn()
    render(<TopicsView {...defaultProps} cycleStatus={cycleStatus} />)
    const badges = screen.getAllByTitle('Click to cycle status')
    fireEvent.click(badges[0])
    expect(cycleStatus).toHaveBeenCalledWith('gke-autopilot')
  })

  it('shows "—" in Updated column when lastUpdated is null', () => {
    render(<TopicsView {...defaultProps} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows relative time in Updated column when lastUpdated is set', () => {
    const recentTs = new Date(Date.now() - 30 * 1000).toISOString()
    const getLastUpdated = (id) => id === 'gke-autopilot' ? recentTs : null
    render(<TopicsView {...defaultProps} getLastUpdated={getLastUpdated} />)
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('renders a Resources button for each topic', () => {
    render(<TopicsView {...defaultProps} />)
    const resourceBtns = screen.getAllByRole('button', { name: /resources/i })
    expect(resourceBtns).toHaveLength(TOPICS.length)
  })

  it('does not render pagination when topics fit in one page', () => {
    render(<TopicsView {...defaultProps} />)
    // 5 topics < PAGE_SIZE (15), so no pagination
    expect(screen.queryByText('← Prev')).not.toBeInTheDocument()
    expect(screen.queryByText('Next →')).not.toBeInTheDocument()
  })

  it('renders pagination when topics exceed PAGE_SIZE', () => {
    const manyTopics = Array.from({ length: 20 }, (_, i) =>
      makeTopic(`topic-${i}`, `Topic ${i}`)
    )
    render(<TopicsView {...defaultProps} topics={manyTopics} />)
    expect(screen.getByText('← Prev')).toBeInTheDocument()
    expect(screen.getByText('Next →')).toBeInTheDocument()
  })

  it('"Prev" button is disabled on the first page', () => {
    const manyTopics = Array.from({ length: 20 }, (_, i) => makeTopic(`t-${i}`, `T ${i}`))
    render(<TopicsView {...defaultProps} topics={manyTopics} />)
    expect(screen.getByText('← Prev')).toBeDisabled()
  })

  it('navigating to next page shows page 2 content', () => {
    const manyTopics = Array.from({ length: 20 }, (_, i) =>
      makeTopic(`topic-${i}`, `Topic Number ${i}`)
    )
    render(<TopicsView {...defaultProps} topics={manyTopics} />)
    fireEvent.click(screen.getByText('Next →'))
    // Page 2 should show topics 15-19
    expect(screen.getByText('Topic Number 15')).toBeInTheDocument()
    expect(screen.queryByText('Topic Number 0')).not.toBeInTheDocument()
  })

  it('sort by Topic header sorts topics alphabetically', () => {
    render(<TopicsView {...defaultProps} />)
    fireEvent.click(screen.getByText('Topic'))
    const rows = screen.getAllByTitle('Click to cycle status')
    // After sorting asc by name, first row should be "Cloud Build"
    const firstRow = rows[0].closest('tr')
    expect(within(firstRow).getByText('Cloud Build')).toBeInTheDocument()
  })

  it('clicking sort header twice reverses order', () => {
    render(<TopicsView {...defaultProps} />)
    fireEvent.click(screen.getByText('Topic'))
    fireEvent.click(screen.getByText('Topic'))
    const rows = screen.getAllByTitle('Click to cycle status')
    // Descending: "VPC Design" should be first ("V" > "I" > "G" > "C")
    const firstRow = rows[0].closest('tr')
    expect(within(firstRow).getByText('VPC Design')).toBeInTheDocument()
  })

  it('opens EditResourceModal when edit button is clicked in tooltip', () => {
    const updateTopicResources = vi.fn()
    render(<TopicsView {...defaultProps} updateTopicResources={updateTopicResources} />)
    // Open the first resource tooltip
    const resourceBtns = screen.getAllByRole('button', { name: /resources/i })
    fireEvent.click(resourceBtns[0])
    // Click "Edit links" in the tooltip
    fireEvent.click(screen.getByText(/Edit links/i))
    // Modal should appear
    expect(screen.getByText('Edit Resources')).toBeInTheDocument()
  })

  // ── Score column ──────────────────────────────────────────────────────────
  describe('score column', () => {
    it('renders a "＋" score button when no test score is set', () => {
      render(<TopicsView {...defaultProps} />)
      const addScoreBtns = screen.getAllByTitle('Add test score')
      expect(addScoreBtns.length).toBe(TOPICS.length)
    })

    it('renders a score badge when test score is set', () => {
      const getTestScore = (id) => id === 'gke-autopilot' ? { score: 85, date: '2026-03-01' } : null
      render(<TopicsView {...defaultProps} getTestScore={getTestScore} />)
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('clicking score badge opens inline edit', () => {
      const getTestScore = (id) => id === 'gke-autopilot' ? { score: 75, date: '2026-03-01' } : null
      render(<TopicsView {...defaultProps} getTestScore={getTestScore} />)
      fireEvent.click(screen.getByText('75%'))
      // Score input should appear
      expect(screen.getByDisplayValue('75')).toBeInTheDocument()
    })

    it('clicking ＋ button opens inline edit for new score', () => {
      render(<TopicsView {...defaultProps} />)
      const addBtns = screen.getAllByTitle('Add test score')
      fireEvent.click(addBtns[0])
      // Number input should appear
      const numberInput = screen.getByTitle('Save') // check ✓ save button appeared
      expect(numberInput).toBeInTheDocument()
    })

    it('calls setTestScore when score is saved', () => {
      const setTestScore = vi.fn()
      render(<TopicsView {...defaultProps} setTestScore={setTestScore} />)
      const addBtns = screen.getAllByTitle('Add test score')
      fireEvent.click(addBtns[0])
      // Find number input and set value
      const numberInputs = screen.getAllByRole('spinbutton')
      fireEvent.change(numberInputs[0], { target: { value: '90' } })
      fireEvent.click(screen.getAllByTitle('Save')[0])
      expect(setTestScore).toHaveBeenCalledWith('gke-autopilot', 90, expect.any(String))
    })

    it('cancels edit without saving when ✕ is clicked', () => {
      const setTestScore = vi.fn()
      render(<TopicsView {...defaultProps} setTestScore={setTestScore} />)
      const addBtns = screen.getAllByTitle('Add test score')
      fireEvent.click(addBtns[0])
      fireEvent.click(screen.getAllByTitle('Cancel')[0])
      expect(setTestScore).not.toHaveBeenCalled()
    })
  })

  // ── Add topic ─────────────────────────────────────────────────────────────
  describe('add topic', () => {
    it('renders "＋ Add Topic" button', () => {
      render(<TopicsView {...defaultProps} />)
      expect(screen.getByText(/Add Topic/)).toBeInTheDocument()
    })

    it('opens AddTopicModal when "＋ Add Topic" is clicked', () => {
      render(<TopicsView {...defaultProps} />)
      fireEvent.click(screen.getByText(/Add Topic/))
      // Modal should show course dropdown
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('closes modal when Cancel is clicked in AddTopicModal', () => {
      render(<TopicsView {...defaultProps} />)
      fireEvent.click(screen.getByText(/Add Topic/))
      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
  })

  // ── Delete topic ──────────────────────────────────────────────────────────
  describe('delete topic', () => {
    it('renders a delete button for each topic', () => {
      render(<TopicsView {...defaultProps} />)
      const deleteBtns = screen.getAllByTitle('Delete topic')
      expect(deleteBtns.length).toBe(TOPICS.length)
    })

    it('calls deleteTopic with correct args after confirmation', () => {
      const deleteTopic = vi.fn()
      render(<TopicsView {...defaultProps} deleteTopic={deleteTopic} />)
      const deleteBtns = screen.getAllByTitle('Delete topic')
      fireEvent.click(deleteBtns[0])
      // window.confirm is mocked to return true in setup.js
      expect(deleteTopic).toHaveBeenCalledWith('gke', 'gke-autopilot')
    })
  })
})
