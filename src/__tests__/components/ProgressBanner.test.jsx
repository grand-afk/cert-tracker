import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBanner from '../../components/ProgressBanner'

// Fix "today" so date calculations are deterministic
const FAKE_TODAY = new Date('2026-03-20T00:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FAKE_TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ProgressBanner', () => {
  it('renders null when percent is null and no targetDate', () => {
    const { container } = render(<ProgressBanner percent={null} targetDate="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when percent is 0 and no targetDate', () => {
    render(<ProgressBanner percent={0} targetDate="" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('displays the correct percentage', () => {
    render(<ProgressBanner percent={42} targetDate="" />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('displays "100%" when fully complete', () => {
    render(<ProgressBanner percent={100} targetDate="" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows days remaining for a future target date', () => {
    render(<ProgressBanner percent={50} targetDate="2026-03-25" />)
    expect(screen.getByText('5 days remaining')).toBeInTheDocument()
  })

  it('uses singular "day" for exactly 1 day remaining', () => {
    render(<ProgressBanner percent={0} targetDate="2026-03-21" />)
    expect(screen.getByText('1 day remaining')).toBeInTheDocument()
  })

  it('shows "Today is the target date!" when target is today', () => {
    render(<ProgressBanner percent={0} targetDate="2026-03-20" />)
    expect(screen.getByText('Today is the target date!')).toBeInTheDocument()
  })

  it('shows overdue message for a past target date', () => {
    render(<ProgressBanner percent={0} targetDate="2026-03-15" />)
    expect(screen.getByText('5 days overdue')).toBeInTheDocument()
  })

  it('uses singular "day" for exactly 1 day overdue', () => {
    render(<ProgressBanner percent={0} targetDate="2026-03-19" />)
    expect(screen.getByText('1 day overdue')).toBeInTheDocument()
  })

  it('renders target date in DD-MMM-YY format', () => {
    render(<ProgressBanner percent={0} targetDate="2026-09-30" />)
    expect(screen.getByText(/30-Sep-26/)).toBeInTheDocument()
  })

  it('renders the target icon 🎯 when targetDate is provided', () => {
    render(<ProgressBanner percent={0} targetDate="2026-06-30" />)
    expect(screen.getByText(/🎯/)).toBeInTheDocument()
  })

  it('does not render target info when no targetDate', () => {
    render(<ProgressBanner percent={75} targetDate="" />)
    expect(screen.queryByText(/🎯/)).not.toBeInTheDocument()
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
  })

  it('sets progress bar fill width equal to percent', () => {
    const { container } = render(<ProgressBanner percent={60} targetDate="" />)
    const fill = container.querySelector('.progress-bar-fill')
    expect(fill.style.width).toBe('60%')
  })

  it('uses 0% as default when percent is undefined', () => {
    render(<ProgressBanner targetDate="" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  describe('date milestone ticks', () => {
    const futureTarget = '2099-12-31'
    // dateMilestones: one entry per unique due date, with topics array
    const milestones = [
      { date: '2099-06-01', topics: [{ name: 'Topic A', courseName: 'GKE', courseColor: '#4285F4' }] },
      { date: '2099-09-01', topics: [{ name: 'Topic B', courseName: 'IAM', courseColor: '#EA4335' },
                                     { name: 'Topic C', courseName: 'IAM', courseColor: '#EA4335' }] },
    ]

    it('renders one tick per unique due date when targetDate is set', () => {
      const { container } = render(
        <ProgressBanner percent={20} targetDate={futureTarget} dateMilestones={milestones} />
      )
      const ticks = container.querySelectorAll('.progress-milestone-tick')
      expect(ticks).toHaveLength(2)
    })

    it('applies course color of first topic to tick', () => {
      const { container } = render(
        <ProgressBanner percent={20} targetDate={futureTarget} dateMilestones={milestones} />
      )
      const tick = container.querySelector('.progress-milestone-tick')
      expect(tick.style.background).toBeTruthy()
    })

    it('renders no ticks when dateMilestones is empty', () => {
      const { container } = render(
        <ProgressBanner percent={20} targetDate={futureTarget} dateMilestones={[]} />
      )
      expect(container.querySelectorAll('.progress-milestone-tick')).toHaveLength(0)
    })

    it('renders no ticks when targetDate is not set', () => {
      const { container } = render(
        <ProgressBanner percent={20} targetDate={null} dateMilestones={milestones} />
      )
      expect(container.querySelectorAll('.progress-milestone-tick')).toHaveLength(0)
    })
  })
})
