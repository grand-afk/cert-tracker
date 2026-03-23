import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResourceTooltip from '../../components/ResourceTooltip'

const EMPTY_RESOURCES = { courseContent: '', video: '', anki: '', testLink: '' }
const FULL_RESOURCES = {
  courseContent: 'https://cloud.google.com/gke',
  video: 'https://youtube.com/gke',
  anki: 'https://ankiweb.net/gke',
  testLink: 'https://practice-test.com/gke',
}

describe('ResourceTooltip', () => {
  it('renders the Resources button', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    expect(screen.getByRole('button', { name: /resources/i })).toBeInTheDocument()
  })

  it('renders 4 pip icons inside the button', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    const btn = screen.getByRole('button', { name: /resources/i })
    // 4 emoji pips — one per resource type
    expect(btn.querySelectorAll('.resource-pip').length).toBe(4)
  })

  it('pip icons are dimmed when no links are set', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    const btn = screen.getByRole('button', { name: /resources/i })
    const pips = btn.querySelectorAll('.resource-pip')
    pips.forEach((p) => expect(p.className).toContain('resource-pip--empty'))
  })

  it('has-links class applied when at least one link is set', () => {
    render(<ResourceTooltip resources={{ courseContent: 'https://test.com', video: '', anki: '', testLink: '' }} />)
    const btn = screen.getByRole('button', { name: /resources/i })
    expect(btn.className).toContain('resource-btn--has-links')
  })

  it('has-links class triggers on testLink alone', () => {
    render(<ResourceTooltip resources={{ courseContent: '', video: '', anki: '', testLink: 'https://test.com' }} />)
    const btn = screen.getByRole('button', { name: /resources/i })
    expect(btn.className).toContain('resource-btn--has-links')
  })

  it('tooltip is closed by default', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens tooltip on button click', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('closes tooltip on second click (toggle)', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    const btn = screen.getByRole('button', { name: /resources/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('displays topicName as tooltip title when provided', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} topicName="GKE Autopilot" />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.getByText('GKE Autopilot')).toBeInTheDocument()
  })

  it('does not render a title when topicName is not provided', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.queryByText('GKE Autopilot')).not.toBeInTheDocument()
  })

  it('shows "not set" for each empty resource (all four)', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.getByText('Course Content — not set')).toBeInTheDocument()
    expect(screen.getByText('Video — not set')).toBeInTheDocument()
    expect(screen.getByText('Anki Deck — not set')).toBeInTheDocument()
    expect(screen.getByText('Practice Test — not set')).toBeInTheDocument()
  })

  it('renders anchor tags for all four provided resource links', () => {
    render(<ResourceTooltip resources={FULL_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
  })

  it('link hrefs match the provided URLs including testLink', () => {
    render(<ResourceTooltip resources={FULL_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain(FULL_RESOURCES.courseContent)
    expect(hrefs).toContain(FULL_RESOURCES.video)
    expect(hrefs).toContain(FULL_RESOURCES.anki)
    expect(hrefs).toContain(FULL_RESOURCES.testLink)
  })

  it('links open in a new tab', () => {
    render(<ResourceTooltip resources={FULL_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    screen.getAllByRole('link').forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('renders edit button when onEdit is provided', () => {
    const onEdit = vi.fn()
    render(<ResourceTooltip resources={EMPTY_RESOURCES} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.getByText(/Edit links/i)).toBeInTheDocument()
  })

  it('does not render edit button when onEdit is not provided', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.queryByText(/Edit links/i)).not.toBeInTheDocument()
  })

  it('calls onEdit and closes tooltip when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<ResourceTooltip resources={EMPTY_RESOURCES} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    fireEvent.click(screen.getByText(/Edit links/i))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('closes tooltip when clicking outside the component', () => {
    render(
      <div>
        <ResourceTooltip resources={EMPTY_RESOURCES} />
        <div data-testid="outside">Outside</div>
      </div>
    )
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('does not close tooltip when clicking inside it', () => {
    render(<ResourceTooltip resources={EMPTY_RESOURCES} topicName="Test" />)
    fireEvent.click(screen.getByRole('button', { name: /resources/i }))
    fireEvent.mouseDown(screen.getByRole('tooltip'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
