import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditResourceModal from '../../components/EditResourceModal'

const EMPTY_RESOURCES = { courseContent: '', video: '', anki: '', testLink: '' }
const EXISTING_RESOURCES = {
  courseContent: 'https://cloud.google.com',
  video: 'https://youtube.com/watch?v=abc',
  anki: 'https://ankiweb.net/shared/123',
  testLink: 'https://practice-test.com',
}

describe('EditResourceModal', () => {
  it('renders the modal title', () => {
    render(<EditResourceModal title="GKE › Autopilot" resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Edit Resources')).toBeInTheDocument()
  })

  it('renders the subtitle/title prop', () => {
    render(<EditResourceModal title="GKE › Autopilot" resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('GKE › Autopilot')).toBeInTheDocument()
  })

  it('shows empty inputs when resources are empty', () => {
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input) => expect(input.value).toBe(''))
  })

  it('renders four input fields (courseContent, video, anki, testLink)', () => {
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(4)
  })

  it('pre-fills inputs with existing resource URLs', () => {
    render(<EditResourceModal resources={EXISTING_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue(EXISTING_RESOURCES.courseContent)).toBeInTheDocument()
    expect(screen.getByDisplayValue(EXISTING_RESOURCES.video)).toBeInTheDocument()
    expect(screen.getByDisplayValue(EXISTING_RESOURCES.anki)).toBeInTheDocument()
    expect(screen.getByDisplayValue(EXISTING_RESOURCES.testLink)).toBeInTheDocument()
  })

  it('calls onSave with the current form values when Save is clicked', () => {
    const onSave = vi.fn()
    render(<EditResourceModal resources={EXISTING_RESOURCES} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(EXISTING_RESOURCES)
  })

  it('saves updated values when inputs are changed then saved', () => {
    const onSave = vi.fn()
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={onSave} onClose={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'https://new-content.com' } })
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ courseContent: 'https://new-content.com' })
    )
  })

  it('saves testLink field value correctly', () => {
    const onSave = vi.fn()
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={onSave} onClose={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    // testLink is the 4th input (index 3)
    fireEvent.change(inputs[3], { target: { value: 'https://my-test.com' } })
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ testLink: 'https://my-test.com' })
    )
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSave AND onClose when Save is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(
      <EditResourceModal resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={onClose} />
    )
    const overlay = container.querySelector('.modal-overlay')
    fireEvent.click(overlay, { target: overlay })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders labels for all four resource types', () => {
    render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/Course Content URL/i)).toBeInTheDocument()
    expect(screen.getByText(/Video URL/i)).toBeInTheDocument()
    expect(screen.getByText(/Anki Deck URL/i)).toBeInTheDocument()
    expect(screen.getByText(/Practice Test URL/i)).toBeInTheDocument()
  })

  it('renders without crashing when title is not provided', () => {
    expect(() =>
      render(<EditResourceModal resources={EMPTY_RESOURCES} onSave={vi.fn()} onClose={vi.fn()} />)
    ).not.toThrow()
  })
})
