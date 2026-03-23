import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddTermModal from '../../components/AddTermModal'

const COURSES = [
  { id: 'gke',        name: 'GKE',        color: '#4285F4' },
  { id: 'iam',        name: 'IAM',        color: '#EA4335' },
  { id: 'networking', name: 'Networking', color: '#FBBC05' },
]

function getAddBtn() {
  return screen.getByRole('button', { name: 'Add Term' })
}

describe('AddTermModal', () => {
  it('renders the modal title "Add Term"', () => {
    const { container } = render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(container.querySelector('.modal-title')).toHaveTextContent('Add Term')
  })

  it('renders a term name input', () => {
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Kubernetes Pod/i)).toBeInTheDocument()
  })

  it('renders a definition textarea', () => {
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Brief definition/i)).toBeInTheDocument()
  })

  it('renders checkboxes for each course', () => {
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(COURSES.length)
  })

  it('renders Cancel and Add Term buttons', () => {
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(getAddBtn()).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={onClose} />)
    const overlay = container.querySelector('.modal-overlay')
    fireEvent.click(overlay, { target: overlay })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error when term is empty and Add Term is clicked', () => {
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(getAddBtn())
    expect(screen.getByText('Term is required')).toBeInTheDocument()
  })

  it('does not call onAdd when term name is empty', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.click(getAddBtn())
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onAdd with correct term and definition when valid', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'Pod' } })
    fireEvent.change(screen.getByPlaceholderText(/Brief definition/i), { target: { value: 'Smallest K8s unit' } })
    fireEvent.click(getAddBtn())
    expect(onAdd).toHaveBeenCalledTimes(1)
    const [termData] = onAdd.mock.calls[0]
    expect(termData.term).toBe('Pod')
    expect(termData.definition).toBe('Smallest K8s unit')
  })

  it('generated id is slugified from the term name', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'My New Term' } })
    fireEvent.click(getAddBtn())
    const [termData] = onAdd.mock.calls[0]
    expect(termData.id).toMatch(/^term-my-new-term-/)
  })

  it('adds empty courses array when no courses selected', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'Term' } })
    fireEvent.click(getAddBtn())
    const [termData] = onAdd.mock.calls[0]
    expect(termData.courses).toEqual([])
  })

  it('adds selected course ids when checkboxes are ticked', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'Pod' } })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // GKE
    fireEvent.click(checkboxes[1]) // IAM
    fireEvent.click(getAddBtn())
    const [termData] = onAdd.mock.calls[0]
    expect(termData.courses).toContain('gke')
    expect(termData.courses).toContain('iam')
    expect(termData.courses).not.toContain('networking')
  })

  it('toggling a checkbox twice deselects it', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'Test' } })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // select GKE
    fireEvent.click(checkboxes[0]) // deselect GKE
    fireEvent.click(getAddBtn())
    const [termData] = onAdd.mock.calls[0]
    expect(termData.courses).not.toContain('gke')
  })

  it('calls onClose after successfully adding a term', () => {
    const onClose = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'Some Term' } })
    fireEvent.click(getAddBtn())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits on Enter keypress in the term input', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/Kubernetes Pod/i)
    fireEvent.change(input, { target: { value: 'Keyboard Term' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('clears error when user starts typing', () => {
    render(<AddTermModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(getAddBtn())
    expect(screen.getByText('Term is required')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'T' } })
    expect(screen.queryByText('Term is required')).not.toBeInTheDocument()
  })

  it('term data includes empty resources object', () => {
    const onAdd = vi.fn()
    render(<AddTermModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Kubernetes Pod/i), { target: { value: 'Term' } })
    fireEvent.click(getAddBtn())
    const [termData] = onAdd.mock.calls[0]
    expect(termData.resources).toEqual({ courseContent: '', video: '', anki: '', testLink: '' })
  })
})
