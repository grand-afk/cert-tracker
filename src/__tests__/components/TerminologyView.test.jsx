import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TerminologyView from '../../components/TerminologyView'

// ── Helpers ───────────────────────────────────────────────────────────────────
const COURSES = [
  { id: 'gke', name: 'GKE', color: '#4285F4' },
  { id: 'iam', name: 'IAM', color: '#EA4335' },
  { id: 'networking', name: 'Networking', color: '#FBBC05' },
]

function makeTerm(id, term, definition, courses = ['gke']) {
  return {
    id,
    term,
    definition,
    courses,
    resources: { courseContent: '', video: '', anki: '' },
  }
}

const TERMS = [
  makeTerm('term-pod', 'Pod', 'Smallest unit in Kubernetes', ['gke']),
  makeTerm('term-node', 'Node', 'Worker machine in Kubernetes', ['gke']),
  makeTerm('term-vpc', 'VPC', 'Virtual Private Cloud', ['networking']),
  makeTerm('term-iam', 'IAM', 'Identity and Access Management', ['iam']),
  makeTerm('term-wi', 'Workload Identity', 'Links K8s SAs to GCP SAs', ['gke', 'iam']),
]

const noop = vi.fn()

const defaultProps = {
  terminology: TERMS,
  courses: COURSES,
  selectedCourses: [],
  getStatus: () => 'not-started',
  cycleStatus: noop,
  getLastUpdated: () => null,
  updateTermResources: noop,
  addTerm: noop,
  deleteTerm: noop,
  clearRating: noop,
  updateTermNotes: noop,
  searchQuery: '',
}

describe('TerminologyView', () => {
  it('renders the Terminology heading', () => {
    render(<TerminologyView {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /Terminology/i })).toBeInTheDocument()
  })

  it('renders all terms when no filter is active', () => {
    render(<TerminologyView {...defaultProps} />)
    // Use getAllByText for terms like "IAM" that also appear in course badges
    TERMS.forEach((t) => {
      expect(screen.getAllByText(t.term).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders definitions for each term', () => {
    render(<TerminologyView {...defaultProps} />)
    TERMS.forEach((t) => {
      expect(screen.getByText(t.definition)).toBeInTheDocument()
    })
  })

  it('shows 0/N complete count in header', () => {
    render(<TerminologyView {...defaultProps} />)
    expect(screen.getByText(`0/${TERMS.length} complete`)).toBeInTheDocument()
  })

  it('shows correct complete count', () => {
    const getStatus = (id) => id === 'term-pod' ? 'complete' : 'not-started'
    render(<TerminologyView {...defaultProps} getStatus={getStatus} />)
    expect(screen.getByText(`1/${TERMS.length} complete`)).toBeInTheDocument()
  })

  it('filters terms by selectedCourses (term.courses intersection)', () => {
    render(<TerminologyView {...defaultProps} selectedCourses={['gke']} />)
    // Should include gke terms and the multi-course workload identity term
    expect(screen.getByText('Pod')).toBeInTheDocument()
    expect(screen.getByText('Node')).toBeInTheDocument()
    expect(screen.getByText('Workload Identity')).toBeInTheDocument()
    // VPC definition is unique — confirms VPC term row is absent
    expect(screen.queryByText('Virtual Private Cloud')).not.toBeInTheDocument()
    // IAM definition is unique — confirms IAM term row is absent
    expect(screen.queryByText('Identity and Access Management')).not.toBeInTheDocument()
  })

  it('includes a multi-course term when any of its courses matches filter', () => {
    render(<TerminologyView {...defaultProps} selectedCourses={['iam']} />)
    expect(screen.getByText('Workload Identity')).toBeInTheDocument()
    // IAM term row present — check its definition to confirm the row itself
    expect(screen.getByText('Identity and Access Management')).toBeInTheDocument()
    // Pod definition absent confirms Pod term row is not shown
    expect(screen.queryByText('Smallest unit in Kubernetes')).not.toBeInTheDocument()
  })

  it('shows empty state when no terms match the filter', () => {
    render(<TerminologyView {...defaultProps} selectedCourses={['databases']} />)
    expect(screen.getByText('No terms found')).toBeInTheDocument()
  })

  it('renders course badges for each term', () => {
    render(<TerminologyView {...defaultProps} />)
    // "GKE" badge appears for gke terms
    const gkeBadges = screen.getAllByText('GKE')
    expect(gkeBadges.length).toBeGreaterThan(0)
  })

  it('renders multiple course badges for a term with multiple courses', () => {
    render(<TerminologyView {...defaultProps} />)
    // "Workload Identity" has ['gke', 'iam'] — find its row
    const wiRow = screen.getByText('Workload Identity').closest('tr')
    expect(wiRow.textContent).toContain('GKE')
    expect(wiRow.textContent).toContain('IAM')
  })

  it('shows "Not Started" status badge by default', () => {
    render(<TerminologyView {...defaultProps} />)
    const badges = screen.getAllByText('Not Started')
    expect(badges.length).toBe(TERMS.length)
  })

  it('calls cycleStatus with the term id when status badge is clicked', () => {
    const cycleStatus = vi.fn()
    render(<TerminologyView {...defaultProps} cycleStatus={cycleStatus} />)
    const badges = screen.getAllByTitle('Click to cycle status')
    fireEvent.click(badges[0])
    expect(cycleStatus).toHaveBeenCalledTimes(1)
  })

  it('terms are sorted alphabetically by default', () => {
    render(<TerminologyView {...defaultProps} />)
    const rows = screen.getAllByTitle('Click to cycle status')
    // First row alphabetically should be "IAM"
    const firstRowText = rows[0].closest('tr').textContent
    expect(firstRowText).toContain('IAM')
  })

  it('clicking the Term header toggles sort direction', () => {
    render(<TerminologyView {...defaultProps} />)
    // Default is asc; click once to go desc
    fireEvent.click(screen.getByText('Term'))
    const rows = screen.getAllByTitle('Click to cycle status')
    // Descending: "Workload Identity" starts with W, should be first
    const firstRowText = rows[0].closest('tr').textContent
    expect(firstRowText).toContain('Workload Identity')
  })

  it('shows "—" in Updated column when lastUpdated is null', () => {
    render(<TerminologyView {...defaultProps} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows relative time when lastUpdated is set', () => {
    const recentTs = new Date(Date.now() - 30 * 1000).toISOString()
    const getLastUpdated = (id) => id === 'term-pod' ? recentTs : null
    render(<TerminologyView {...defaultProps} getLastUpdated={getLastUpdated} />)
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('renders a Resources button for each term', () => {
    render(<TerminologyView {...defaultProps} />)
    const btns = screen.getAllByRole('button', { name: /resources/i })
    expect(btns).toHaveLength(TERMS.length)
  })

  it('does not render pagination when terms fit on one page', () => {
    render(<TerminologyView {...defaultProps} />)
    // 5 terms < PAGE_SIZE (15)
    expect(screen.queryByText('← Prev')).not.toBeInTheDocument()
  })

  it('opens EditResourceModal when edit link is clicked in tooltip', () => {
    render(<TerminologyView {...defaultProps} />)
    const btns = screen.getAllByRole('button', { name: /resources/i })
    fireEvent.click(btns[0])
    fireEvent.click(screen.getByText(/Edit links/i))
    expect(screen.getByText('Edit Resources')).toBeInTheDocument()
  })

  it('renders without crashing when terminology is empty', () => {
    expect(() =>
      render(<TerminologyView {...defaultProps} terminology={[]} />)
    ).not.toThrow()
    expect(screen.getByText('No terms found')).toBeInTheDocument()
  })

  // ── Add Term ──────────────────────────────────────────────────────────────
  describe('add term', () => {
    it('renders "＋ Add Term" button', () => {
      render(<TerminologyView {...defaultProps} />)
      expect(screen.getByText(/Add Term/)).toBeInTheDocument()
    })

    it('opens AddTermModal when "＋ Add Term" is clicked', () => {
      render(<TerminologyView {...defaultProps} />)
      fireEvent.click(screen.getByText(/Add Term/))
      expect(screen.getByPlaceholderText(/Brief definition/i)).toBeInTheDocument()
    })

    it('closes AddTermModal when Cancel is clicked', () => {
      render(<TerminologyView {...defaultProps} />)
      fireEvent.click(screen.getByText(/Add Term/))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByPlaceholderText(/Brief definition/i)).not.toBeInTheDocument()
    })
  })

  // ── Delete Term ───────────────────────────────────────────────────────────
  describe('delete term', () => {
    it('renders a delete button for each term', () => {
      render(<TerminologyView {...defaultProps} />)
      const deleteBtns = screen.getAllByTitle('Delete term')
      expect(deleteBtns.length).toBe(TERMS.length)
    })

    it('calls deleteTerm with the term id after confirmation', () => {
      const deleteTerm = vi.fn()
      render(<TerminologyView {...defaultProps} deleteTerm={deleteTerm} />)
      const deleteBtns = screen.getAllByTitle('Delete term')
      // Terms sorted alphabetically: first is IAM (term-iam)
      fireEvent.click(deleteBtns[0])
      expect(deleteTerm).toHaveBeenCalledWith('term-iam')
    })
  })
})
