/**
 * Mobile layout tests
 *
 * These tests simulate narrow viewports and verify that components
 * render correctly (or are hidden) at mobile widths.
 *
 * Note: jsdom doesn't process CSS media queries, so we test the
 * structural/class presence rather than computed CSS visibility.
 * CSS-level hiding (e.g. display:none via @media) is covered by
 * visual regression testing outside this suite.
 *
 * What we DO verify:
 *  - Components render without crashing at mobile viewport widths
 *  - Key landmark elements are always present (accessible)
 *  - The horizontal-scroll wrapper classes exist on tables
 *  - BottomNav key hints (.nav-btn__key) are in the DOM (CSS hides them on mobile)
 *  - TopBar chip bar has the correct class for overflow scroll
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import BottomNav from '../../components/BottomNav'
import TopBar from '../../components/TopBar'
import TopicsView from '../../components/TopicsView'
import TerminologyView from '../../components/TerminologyView'
import StudyView from '../../components/StudyView'

// ── Viewport helpers ──────────────────────────────────────────────────────────
function setViewport(width, height = 812) {
  Object.defineProperty(window, 'innerWidth',  { writable: true, configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height })
  window.dispatchEvent(new Event('resize'))
}

const MOBILE_WIDTH  = 375  // iPhone SE
const TABLET_WIDTH  = 768  // iPad mini
const DESKTOP_WIDTH = 1280

beforeAll(() => setViewport(MOBILE_WIDTH))
afterAll(() => setViewport(DESKTOP_WIDTH))

// ── Shared fixture data ───────────────────────────────────────────────────────
const COURSES = [
  { id: 'gke', name: 'GKE', color: '#4285F4', key: 'G' },
  { id: 'iam', name: 'IAM', color: '#EA4335', key: 'I' },
]

function makeTopic(id, name) {
  return { id, name, courseId: 'gke', courseName: 'GKE', courseColor: '#4285F4',
           resources: { courseContent: '', video: '', anki: '', testLink: '' } }
}
function makeTerm(id, term, definition) {
  return { id, term, definition, courses: ['gke'],
           resources: { courseContent: '', video: '', anki: '', testLink: '' } }
}

const TOPICS = [makeTopic('t1', 'Topic One'), makeTopic('t2', 'Topic Two')]
const TERMS  = [makeTerm('term-1', 'Pod', 'Smallest K8s unit')]

const noop = vi.fn()

// ── BottomNav — mobile ────────────────────────────────────────────────────────
describe('BottomNav — mobile viewport', () => {
  it('renders all six tabs at 375px width', () => {
    setViewport(MOBILE_WIDTH)
    render(<BottomNav view="topics" setView={noop} />)
    expect(screen.getByText('Topics')).toBeInTheDocument()
    expect(screen.getByText('Study')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Terms')).toBeInTheDocument()
    expect(screen.getByText('Help')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders nav role at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<BottomNav view="topics" setView={noop} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('key hint spans are in the DOM (CSS hides them at mobile via @media)', () => {
    setViewport(MOBILE_WIDTH)
    const { container } = render(<BottomNav view="topics" setView={noop} />)
    // The .nav-btn__key elements exist in DOM; CSS hides them at ≤600px
    const keyHints = container.querySelectorAll('.nav-btn__key')
    expect(keyHints.length).toBe(6)
  })

  it('renders correctly at tablet width (768px)', () => {
    setViewport(TABLET_WIDTH)
    render(<BottomNav view="study" setView={noop} />)
    expect(screen.getByText('Study')).toBeInTheDocument()
  })
})

// ── TopBar — mobile ───────────────────────────────────────────────────────────
describe('TopBar — mobile viewport', () => {
  const topBarProps = {
    certName: 'GCP Pro Arch',
    courses: COURSES,
    selectedCourses: [],
    toggleCourse: noop,
    clearSelectedCourses: noop,
    darkMode: false,
    toggleDarkMode: noop,
    onEditCertName: noop,
    searchQuery: '',
    setSearchQuery: noop,
  }

  it('renders cert name at 375px', () => {
    setViewport(MOBILE_WIDTH)
    render(<TopBar {...topBarProps} />)
    expect(screen.getByText(/GCP Pro Arch/)).toBeInTheDocument()
  })

  it('renders All chip at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<TopBar {...topBarProps} />)
    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument()
  })

  it('chip-key badges are in the DOM (hidden via CSS on mobile)', () => {
    setViewport(MOBILE_WIDTH)
    const { container } = render(<TopBar {...topBarProps} />)
    const chipKeys = container.querySelectorAll('.chip-key')
    // +1 for the [A] badge on the All chip
    expect(chipKeys.length).toBe(COURSES.length + 1)
  })

  it('chip bar row has topbar-row2 class for overflow scrolling', () => {
    setViewport(MOBILE_WIDTH)
    const { container } = render(<TopBar {...topBarProps} />)
    expect(container.querySelector('.topbar-row2')).toBeInTheDocument()
  })
})

// ── TopicsView — mobile ───────────────────────────────────────────────────────
describe('TopicsView — mobile viewport', () => {
  const topicsProps = {
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
    clearRating: noop,
    updateTopicNotes: noop,
    searchQuery: '',
  }

  it('renders without crashing at 375px', () => {
    setViewport(MOBILE_WIDTH)
    expect(() => render(<TopicsView {...topicsProps} />)).not.toThrow()
  })

  it('all topics are visible at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<TopicsView {...topicsProps} />)
    expect(screen.getByText('Topic One')).toBeInTheDocument()
    expect(screen.getByText('Topic Two')).toBeInTheDocument()
  })

  it('table wrapper has scroll class for horizontal overflow', () => {
    setViewport(MOBILE_WIDTH)
    const { container } = render(<TopicsView {...topicsProps} />)
    expect(container.querySelector('.study-table-wrapper')).toBeInTheDocument()
  })

  it('renders Add Topic button at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<TopicsView {...topicsProps} />)
    expect(screen.getByText(/Add Topic/)).toBeInTheDocument()
  })
})

// ── TerminologyView — mobile ──────────────────────────────────────────────────
describe('TerminologyView — mobile viewport', () => {
  const termProps = {
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

  it('renders without crashing at 375px', () => {
    setViewport(MOBILE_WIDTH)
    expect(() => render(<TerminologyView {...termProps} />)).not.toThrow()
  })

  it('shows term data at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<TerminologyView {...termProps} />)
    expect(screen.getByText('Pod')).toBeInTheDocument()
    expect(screen.getByText('Smallest K8s unit')).toBeInTheDocument()
  })

  it('renders Add Term button at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<TerminologyView {...termProps} />)
    expect(screen.getByText(/Add Term/)).toBeInTheDocument()
  })
})

// ── StudyView — mobile ────────────────────────────────────────────────────────
describe('StudyView — mobile viewport', () => {
  const studyProps = {
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

  it('renders without crashing at 375px', () => {
    setViewport(MOBILE_WIDTH)
    expect(() => render(<StudyView {...studyProps} />)).not.toThrow()
  })

  it('shows Study heading at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<StudyView {...studyProps} />)
    expect(screen.getByRole('heading', { name: /Study/i })).toBeInTheDocument()
  })

  it('Again/Hard/Good/Easy buttons are present at mobile width', () => {
    setViewport(MOBILE_WIDTH)
    render(<StudyView {...studyProps} />)
    expect(screen.getAllByText('Again').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Easy').length).toBeGreaterThan(0)
  })

  it('table wrapper exists for horizontal scroll on mobile', () => {
    setViewport(MOBILE_WIDTH)
    const { container } = render(<StudyView {...studyProps} />)
    expect(container.querySelector('.study-table-wrapper')).toBeInTheDocument()
  })
})
