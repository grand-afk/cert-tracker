import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomNav from '../../components/BottomNav'

describe('BottomNav', () => {
  it('renders all four tabs', () => {
    render(<BottomNav view="topics" setView={vi.fn()} />)
    expect(screen.getByText('Topics')).toBeInTheDocument()
    expect(screen.getByText('Terminology')).toBeInTheDocument()
    expect(screen.getByText('Study')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('applies active class to the current view tab', () => {
    render(<BottomNav view="topics" setView={vi.fn()} />)
    const topicsBtn = screen.getByRole('button', { name: /Topics/ })
    expect(topicsBtn.className).toContain('nav-btn--active')
  })

  it('does not apply active class to non-active tabs', () => {
    render(<BottomNav view="topics" setView={vi.fn()} />)
    const termBtn     = screen.getByRole('button', { name: /Terminology/ })
    const studyBtn    = screen.getByRole('button', { name: /Study/ })
    const settingsBtn = screen.getByRole('button', { name: /Settings/ })
    expect(termBtn.className).not.toContain('nav-btn--active')
    expect(studyBtn.className).not.toContain('nav-btn--active')
    expect(settingsBtn.className).not.toContain('nav-btn--active')
  })

  it('sets aria-current="page" on the active tab', () => {
    render(<BottomNav view="terminology" setView={vi.fn()} />)
    const termBtn = screen.getByRole('button', { name: /Terminology/ })
    expect(termBtn).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current on inactive tabs', () => {
    render(<BottomNav view="terminology" setView={vi.fn()} />)
    const topicsBtn = screen.getByRole('button', { name: /Topics/ })
    expect(topicsBtn).not.toHaveAttribute('aria-current')
  })

  it('calls setView with "topics" when Topics is clicked', () => {
    const setView = vi.fn()
    render(<BottomNav view="settings" setView={setView} />)
    fireEvent.click(screen.getByRole('button', { name: /Topics/ }))
    expect(setView).toHaveBeenCalledWith('topics')
  })

  it('calls setView with "terminology" when Terminology is clicked', () => {
    const setView = vi.fn()
    render(<BottomNav view="topics" setView={setView} />)
    fireEvent.click(screen.getByRole('button', { name: /Terminology/ }))
    expect(setView).toHaveBeenCalledWith('terminology')
  })

  it('calls setView with "study" when Study is clicked', () => {
    const setView = vi.fn()
    render(<BottomNav view="topics" setView={setView} />)
    fireEvent.click(screen.getByRole('button', { name: /Study/ }))
    expect(setView).toHaveBeenCalledWith('study')
  })

  it('calls setView with "settings" when Settings is clicked', () => {
    const setView = vi.fn()
    render(<BottomNav view="topics" setView={setView} />)
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }))
    expect(setView).toHaveBeenCalledWith('settings')
  })

  it('applies active class to Study tab when study view is active', () => {
    render(<BottomNav view="study" setView={vi.fn()} />)
    const studyBtn = screen.getByRole('button', { name: /Study/ })
    expect(studyBtn.className).toContain('nav-btn--active')
  })

  it('works for settings as the active view', () => {
    render(<BottomNav view="settings" setView={vi.fn()} />)
    const settingsBtn = screen.getByRole('button', { name: /Settings/ })
    expect(settingsBtn.className).toContain('nav-btn--active')
  })

  it('renders icons for each tab', () => {
    const { container } = render(<BottomNav view="topics" setView={vi.fn()} />)
    const icons = container.querySelectorAll('.nav-btn__icon')
    expect(icons).toHaveLength(4)
  })

  it('renders keyboard key hints for each tab', () => {
    const { container } = render(<BottomNav view="topics" setView={vi.fn()} />)
    const keys = container.querySelectorAll('.nav-btn__key')
    expect(keys).toHaveLength(4)
  })

  it('keyboard key hints show 1, 2, 3, 4', () => {
    const { container } = render(<BottomNav view="topics" setView={vi.fn()} />)
    const keys = [...container.querySelectorAll('.nav-btn__key')].map((el) => el.textContent)
    expect(keys).toEqual(['1', '2', '3', '4'])
  })
})
