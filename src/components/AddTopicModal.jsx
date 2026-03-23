import { useState } from 'react'

export default function AddTopicModal({ courses, onAdd, onClose }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleAdd() {
    if (!name.trim()) { setError('Topic name is required'); return }
    if (!courseId)    { setError('Please select a course'); return }
    const id = `${courseId}-${name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
    onAdd(courseId, { id, name: name.trim(), resources: { courseContent: '', video: '', anki: '', testLink: '' } })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Topic</div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Course</label>
          <select className="form-input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Topic Name</label>
          <input
            className="form-input"
            placeholder="e.g. GKE Node Pools"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Topic</button>
        </div>
      </div>
    </div>
  )
}
