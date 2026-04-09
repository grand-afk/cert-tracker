import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddTopicModal from '../../components/AddTopicModal'

const COURSES = [
  { id: 'gke',        name: 'GKE' },
  { id: 'cloud-run',  name: 'Cloud Run' },
  { id: 'networking', name: 'Networking' },
]

// Helper: get the submit button specifically (not the title text)
function getAddBtn() {
  return screen.getByRole('button', { name: 'Add Topic' })
}

describe('AddTopicModal', () => {
  it('renders the modal title "Add Topic"', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    // There will be multiple "Add Topic" texts (title + button); check at least one is in a modal-title
    const { container } = render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(container.querySelector('.modal-title')).toHaveTextContent('Add Topic')
  })

  it('renders a course dropdown with all courses', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getAllByText('GKE')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Cloud Run')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Networking')[0]).toBeInTheDocument()
  })

  it('renders a topic name input', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText(/GKE Node Pools/i)).toBeInTheDocument()
  })

  it('renders Cancel and Add Topic buttons', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(getAddBtn()).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={onClose} />
    )
    const overlay = container.querySelector('.modal-overlay')
    fireEvent.click(overlay, { target: overlay })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error when Add Topic button is clicked with empty name', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(getAddBtn())
    expect(screen.getByText('Topic name is required')).toBeInTheDocument()
  })

  it('does not call onAdd when topic name is empty', () => {
    const onAdd = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.click(getAddBtn())
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onAdd with correct courseId and name when valid input is provided', () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={onAdd} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/GKE Node Pools/i), {
      target: { value: 'My New Topic' },
    })
    fireEvent.click(getAddBtn())
    expect(onAdd).toHaveBeenCalledTimes(1)
    const [courseId, topicData] = onAdd.mock.calls[0]
    expect(courseId).toBe('gke') // first course selected by default
    expect(topicData.name).toBe('My New Topic')
    expect(topicData.id).toBeDefined()
    expect(typeof topicData.id).toBe('string')
  })

  it('generated topic id is slugified from the name', () => {
    const onAdd = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/GKE Node Pools/i), {
      target: { value: 'GKE Node Pools' },
    })
    fireEvent.click(getAddBtn())
    const [, topicData] = onAdd.mock.calls[0]
    expect(topicData.id).toMatch(/^gke-gke-node-pools-/)
  })

  it('calls onClose after successfully adding a topic', () => {
    const onClose = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/GKE Node Pools/i), {
      target: { value: 'Some Topic' },
    })
    fireEvent.click(getAddBtn())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('can select a different course from the dropdown', () => {
    const onAdd = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cloud-run' } })
    fireEvent.change(screen.getByPlaceholderText(/GKE Node Pools/i), {
      target: { value: 'My Topic' },
    })
    fireEvent.click(getAddBtn())
    const [courseId] = onAdd.mock.calls[0]
    expect(courseId).toBe('cloud-run')
  })

  it('submits when Enter is pressed in the input', () => {
    const onAdd = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/GKE Node Pools/i)
    fireEvent.change(input, { target: { value: 'Keyboard Topic' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('clears the error when user starts typing again', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(getAddBtn())
    expect(screen.getByText('Topic name is required')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/GKE Node Pools/i), {
      target: { value: 'T' },
    })
    expect(screen.queryByText('Topic name is required')).not.toBeInTheDocument()
  })

  it('topic data includes empty resources object', () => {
    const onAdd = vi.fn()
    render(<AddTopicModal courses={COURSES} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/GKE Node Pools/i), {
      target: { value: 'Topic With Resources' },
    })
    fireEvent.click(getAddBtn())
    const [, topicData] = onAdd.mock.calls[0]
    expect(topicData.resources).toEqual({
      courseContent: '',
      video: '',
      anki: '',
      testLink: '',
    })
  })
})

// ── Subtopic mode (when subtopicsEnabled + topics + onAddSub provided) ───────
const PARENT_TOPICS = [
  { id: 'topic-gke-networking', name: 'GKE Networking', courseId: 'gke',        courseName: 'GKE' },
  { id: 'topic-vpc-design',     name: 'VPC Design',     courseId: 'networking',  courseName: 'Networking' },
]

describe('AddTopicModal — subtopic mode', () => {
  function renderWithSubtopics(overrides = {}) {
    return render(
      <AddTopicModal
        courses={COURSES}
        onAdd={vi.fn()}
        onClose={vi.fn()}
        topics={PARENT_TOPICS}
        onAddSub={vi.fn()}
        subtopicsEnabled
        {...overrides}
      />
    )
  }

  it('shows mode toggle buttons when subtopicsEnabled and topics provided', () => {
    renderWithSubtopics()
    expect(screen.getByRole('button', { name: 'New Topic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sub-Topic to existing' })).toBeInTheDocument()
  })

  it('does not show mode toggle when subtopicsEnabled is false', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} topics={PARENT_TOPICS} onAddSub={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'New Topic' })).not.toBeInTheDocument()
  })

  it('does not show mode toggle when topics list is empty', () => {
    render(<AddTopicModal courses={COURSES} onAdd={vi.fn()} onClose={vi.fn()} topics={[]} onAddSub={vi.fn()} subtopicsEnabled />)
    expect(screen.queryByRole('button', { name: 'New Topic' })).not.toBeInTheDocument()
  })

  it('switches to subtopic mode when "Sub-Topic to existing" is clicked', () => {
    renderWithSubtopics()
    fireEvent.click(screen.getByRole('button', { name: 'Sub-Topic to existing' }))
    expect(screen.getByRole('button', { name: 'Add Sub-Topic' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Auto-scaling/i)).toBeInTheDocument()
  })

  it('shows parent topic dropdown in subtopic mode', () => {
    renderWithSubtopics()
    fireEvent.click(screen.getByRole('button', { name: 'Sub-Topic to existing' }))
    // Dropdown should contain parent topic options
    expect(screen.getByText(/GKE Networking/)).toBeInTheDocument()
    expect(screen.getByText(/VPC Design/)).toBeInTheDocument()
  })

  it('calls onAddSub with correct courseId, topicId and name', () => {
    const onAddSub = vi.fn()
    renderWithSubtopics({ onAddSub })
    fireEvent.click(screen.getByRole('button', { name: 'Sub-Topic to existing' }))
    fireEvent.change(screen.getByPlaceholderText(/Auto-scaling/i), { target: { value: 'My Sub' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Sub-Topic' }))
    expect(onAddSub).toHaveBeenCalledTimes(1)
    const [courseId, topicId, subData] = onAddSub.mock.calls[0]
    expect(courseId).toBe('gke')         // first topic's courseId
    expect(topicId).toBe('topic-gke-networking')
    expect(subData.name).toBe('My Sub')
    expect(subData.id).toMatch(/^sub-topic-gke-networking-/)
  })

  it('shows error when Add Sub-Topic is clicked with empty name', () => {
    renderWithSubtopics()
    fireEvent.click(screen.getByRole('button', { name: 'Sub-Topic to existing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Sub-Topic' }))
    expect(screen.getByText('Sub-topic name is required')).toBeInTheDocument()
  })

  it('switching back to "New Topic" mode shows topic form', () => {
    renderWithSubtopics()
    fireEvent.click(screen.getByRole('button', { name: 'Sub-Topic to existing' }))
    fireEvent.click(screen.getByRole('button', { name: 'New Topic' }))
    expect(screen.getByPlaceholderText(/GKE Node Pools/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Topic' })).toBeInTheDocument()
  })
})
