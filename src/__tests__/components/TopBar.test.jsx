import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TopBar from '../../components/TopBar'

const COURSES = [
  { id: 'gke', name: 'GKE', color: '#4285F4' },
  { id: 'iam', name: 'IAM', color: '#EA4335' },
  { id: 'networking', name: 'Networking', color: '#FBBC05' },
]

const defaultProps = {
  certName: 'Google Professional Cloud Architect',
  courses: COURSES,
  selectedCourses: [],
  toggleCourse: vi.fn(),
  clearSelectedCourses: vi.fn(),
  darkMode: true,
  toggleDarkMode: vi.fn(),
  onEditCertName: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
}

describe('TopBar', () => {
  it('renders the certification name', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByText(/Google Professional Cloud Architect/)).toBeInTheDocument()
  })

  it('renders an "All" chip', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument()
  })

  it('renders a chip for each course', () => {
    render(<TopBar {...defaultProps} />)
    COURSES.forEach((c) => {
      expect(screen.getByRole('button', { name: new RegExp(c.name) })).toBeInTheDocument()
    })
  })

  it('"All" chip is active when no courses are selected', () => {
    render(<TopBar {...defaultProps} selectedCourses={[]} />)
    const allChip = screen.getByRole('button', { name: /All/i })
    expect(allChip.className).toContain('course-chip--active')
  })

  it('"All" chip is NOT active when courses are selected', () => {
    render(<TopBar {...defaultProps} selectedCourses={['gke']} />)
    const allChip = screen.getByRole('button', { name: /All/i })
    expect(allChip.className).not.toContain('course-chip--active')
  })

  it('selected course chip has active class', () => {
    render(<TopBar {...defaultProps} selectedCourses={['iam']} />)
    const iamChip = screen.getByRole('button', { name: /IAM/ })
    expect(iamChip.className).toContain('course-chip--active')
  })

  it('non-selected course chips do not have active class', () => {
    render(<TopBar {...defaultProps} selectedCourses={['iam']} />)
    const gkeChip = screen.getByRole('button', { name: /GKE/ })
    expect(gkeChip.className).not.toContain('course-chip--active')
  })

  it('clicking a course chip calls toggleCourse with the course id', () => {
    const toggleCourse = vi.fn()
    render(<TopBar {...defaultProps} toggleCourse={toggleCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /GKE/ }))
    expect(toggleCourse).toHaveBeenCalledWith('gke')
  })

  it('clicking the "All" chip calls clearSelectedCourses', () => {
    const clearSelectedCourses = vi.fn()
    render(<TopBar {...defaultProps} clearSelectedCourses={clearSelectedCourses} />)
    fireEvent.click(screen.getByRole('button', { name: /All/i }))
    expect(clearSelectedCourses).toHaveBeenCalledTimes(1)
  })

  it('clicking the cert name button calls onEditCertName', () => {
    const onEditCertName = vi.fn()
    render(<TopBar {...defaultProps} onEditCertName={onEditCertName} />)
    fireEvent.click(screen.getByRole('button', { name: /Google Professional Cloud Architect/ }))
    expect(onEditCertName).toHaveBeenCalledTimes(1)
  })

  it('shows ☀️ icon when darkMode is true', () => {
    render(<TopBar {...defaultProps} darkMode={true} />)
    expect(screen.getByTitle(/Switch to light mode/i)).toBeInTheDocument()
  })

  it('shows 🌙 icon when darkMode is false', () => {
    render(<TopBar {...defaultProps} darkMode={false} />)
    expect(screen.getByTitle(/Switch to dark mode/i)).toBeInTheDocument()
  })

  it('clicking the dark mode button calls toggleDarkMode', () => {
    const toggleDarkMode = vi.fn()
    render(<TopBar {...defaultProps} toggleDarkMode={toggleDarkMode} />)
    fireEvent.click(screen.getByTitle(/Switch to light mode/i))
    expect(toggleDarkMode).toHaveBeenCalledTimes(1)
  })

  it('renders with no courses without crashing', () => {
    expect(() => render(<TopBar {...defaultProps} courses={[]} />)).not.toThrow()
  })

  it('does not render a chip for a hidden course', () => {
    const coursesWithHidden = [
      { id: 'gke', name: 'GKE', color: '#4285F4', hidden: false },
      { id: 'iam', name: 'IAM', color: '#EA4335', hidden: true },
      { id: 'networking', name: 'Networking', color: '#FBBC05', hidden: false },
    ]
    render(<TopBar {...defaultProps} courses={coursesWithHidden} />)
    expect(screen.getByRole('button', { name: /GKE/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^IAM/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Networking/ })).toBeInTheDocument()
  })

  it('renders chip-key badge when course has a key', () => {
    const coursesWithKey = [{ id: 'gke', name: 'GKE', color: '#4285F4', key: 'G' }]
    const { container } = render(<TopBar {...defaultProps} courses={coursesWithKey} />)
    const keyBadges = container.querySelectorAll('.chip-key')
    // First badge is the [A] on the All chip; second is the course key
    const courseKeyBadge = [...keyBadges].find((b) => b.textContent === 'G')
    expect(courseKeyBadge).toBeInTheDocument()
  })
})
