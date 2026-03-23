import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RateButtons from '../../components/RateButtons'

describe('RateButtons', () => {
  it('renders four buttons: Again, Hard, Good, Easy', () => {
    render(<RateButtons onRate={vi.fn()} />)
    expect(screen.getByText('Again')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
  })

  it('calls onRate with quality 0 when Again is clicked', () => {
    const onRate = vi.fn()
    render(<RateButtons onRate={onRate} />)
    fireEvent.click(screen.getByText('Again'))
    expect(onRate).toHaveBeenCalledWith(0)
  })

  it('calls onRate with quality 3 when Hard is clicked', () => {
    const onRate = vi.fn()
    render(<RateButtons onRate={onRate} />)
    fireEvent.click(screen.getByText('Hard'))
    expect(onRate).toHaveBeenCalledWith(3)
  })

  it('calls onRate with quality 4 when Good is clicked', () => {
    const onRate = vi.fn()
    render(<RateButtons onRate={onRate} />)
    fireEvent.click(screen.getByText('Good'))
    expect(onRate).toHaveBeenCalledWith(4)
  })

  it('calls onRate with quality 5 when Easy is clicked', () => {
    const onRate = vi.fn()
    render(<RateButtons onRate={onRate} />)
    fireEvent.click(screen.getByText('Easy'))
    expect(onRate).toHaveBeenCalledWith(5)
  })

  it('buttons are enabled by default', () => {
    render(<RateButtons onRate={vi.fn()} />)
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).not.toBeDisabled()
    })
  })

  it('disables all buttons when disabled=true', () => {
    render(<RateButtons onRate={vi.fn()} disabled={true} />)
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it('applies rate-btn--again class to Again button', () => {
    render(<RateButtons onRate={vi.fn()} />)
    expect(screen.getByText('Again').className).toContain('rate-btn--again')
  })

  it('applies rate-btn--hard class to Hard button', () => {
    render(<RateButtons onRate={vi.fn()} />)
    expect(screen.getByText('Hard').className).toContain('rate-btn--hard')
  })

  it('applies rate-btn--good class to Good button', () => {
    render(<RateButtons onRate={vi.fn()} />)
    expect(screen.getByText('Good').className).toContain('rate-btn--good')
  })

  it('applies rate-btn--easy class to Easy button', () => {
    render(<RateButtons onRate={vi.fn()} />)
    expect(screen.getByText('Easy').className).toContain('rate-btn--easy')
  })

  it('applies rate-buttons--compact class when compact=true', () => {
    const { container } = render(<RateButtons onRate={vi.fn()} compact={true} />)
    expect(container.querySelector('.rate-buttons--compact')).toBeInTheDocument()
  })

  it('does not apply rate-buttons--compact class by default', () => {
    const { container } = render(<RateButtons onRate={vi.fn()} />)
    expect(container.querySelector('.rate-buttons--compact')).not.toBeInTheDocument()
  })

  it('does not call onRate when button is disabled', () => {
    const onRate = vi.fn()
    render(<RateButtons onRate={onRate} disabled={true} />)
    fireEvent.click(screen.getByText('Good'))
    expect(onRate).not.toHaveBeenCalled()
  })
})
